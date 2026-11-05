import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = {};
sandbox.globalThis = sandbox;
vm.runInNewContext(readFileSync(new URL('../assets/scene-fit.js', import.meta.url), 'utf8'), sandbox);
const { sceneCoverRect, chooseSceneFile } = sandbox;

function covers(rect, vw, vh) {
  assert.ok(rect.left <= 0.6, 'left gap');
  assert.ok(rect.top <= 0.6, 'top gap');
  assert.ok(rect.left + rect.width >= vw - 0.6, 'right gap');
  assert.ok(rect.top + rect.height >= vh - 0.6, 'bottom gap');
}

test('portrait cover keeps the image aspect and about 26% of the width', () => {
  const rect = sceneCoverRect(390, 844, 1600, 893, 0.5, 0.56);
  covers(rect, 390, 844);
  assert.ok(Math.abs(rect.width / rect.height - 1600 / 893) < 0.01);
  const fraction = 390 / rect.width;
  assert.ok(fraction > 0.24 && fraction < 0.28, String(fraction));
});

test('desktop cover keeps most of the landscape frame', () => {
  const rect = sceneCoverRect(1280, 800, 1600, 893, 0.5, 0.56);
  covers(rect, 1280, 800);
  assert.ok(Math.abs(rect.width / rect.height - 1600 / 893) < 0.01);
  const fraction = 1280 / rect.width;
  assert.ok(fraction > 0.85, String(fraction));
});

test('landscape phone still covers without stretching', () => {
  const rect = sceneCoverRect(844, 390, 1600, 893, 0.5, 0.56);
  covers(rect, 844, 390);
  assert.ok(Math.abs(rect.width / rect.height - 1600 / 893) < 0.01);
});

test('portrait asset is selected only when HAVE lists it', () => {
  const have = new Set(['portrait/bg_kitchen.jpg']);
  const portrait = chooseSceneFile('bg_kitchen.jpg', true, have);
  assert.equal(portrait.kind, 'portrait');
  assert.equal(portrait.file, 'portrait/bg_kitchen.jpg');
  const missing = chooseSceneFile('bg_kitchen.jpg', true, new Set());
  assert.equal(missing.kind, 'landscape');
  assert.equal(missing.file, 'bg_kitchen.jpg');
  const wide = chooseSceneFile('bg_kitchen.jpg', false, have);
  assert.equal(wide.kind, 'landscape');
});

test('home.jpg is mapped as unused so it is not the live summer room', () => {
  const choice = chooseSceneFile('home.jpg', true, new Set());
  assert.equal(choice.file, 'home.jpg');
  assert.equal(sandbox.SCENE_FILES['home.jpg'].unused, true);
  assert.equal(sandbox.SCENE_FILES['home_empty.jpg'].portrait, 'portrait/home_empty.jpg');
});
