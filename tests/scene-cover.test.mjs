import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = {};
sandbox.globalThis = sandbox;
vm.runInNewContext(readFileSync(new URL('../assets/scene-fit.js', import.meta.url), 'utf8'), sandbox);
const { sceneCoverRect, chooseSceneFile, sceneFocus, sceneFrameOf, SCENE_FILES } = sandbox;
const manifest = JSON.parse(readFileSync(new URL('../assets/scene-sources.json', import.meta.url), 'utf8'));

function inside(frame, box, slack = 0.004) {
  assert.ok(box.x0 >= frame.x0 - slack && box.x1 <= frame.x1 + slack, JSON.stringify({ frame, box }));
}

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

test('webp derivative is used only when HAVE lists it, and JPEG stays the fallback', () => {
  const have = new Set(['opt/bg_kitchen.webp']);
  const picked = chooseSceneFile('bg_kitchen.jpg', true, have);
  assert.equal(picked.file, 'opt/bg_kitchen.webp');
  assert.equal(picked.fallback, 'bg_kitchen.jpg');
  assert.equal(picked.encoded, 'webp');
  assert.equal(picked.kind, 'landscape');
  const portrait = new Set(['opt/bg_kitchen.webp', 'portrait/bg_kitchen.jpg']);
  const art = chooseSceneFile('bg_kitchen.jpg', true, portrait);
  assert.equal(art.kind, 'portrait');
  assert.equal(art.file, 'portrait/bg_kitchen.jpg');
  assert.equal(art.encoded, 'original');
});

test('autumn sleep box stays inside the phone crop at 360, 390, and 430', () => {
  const sleep = { x0: 0.26, x1: 0.36, y0: 0.4, y1: 0.7 };
  for (const w of [360, 390, 430]) {
    const focus = sceneFocus(w, 844, 1600, 893, [0.42, 0.58], { required: [sleep], optional: [] });
    const frame = sceneFrameOf(w, 844, 1600, 893, focus.x, focus.y);
    inside(frame, sleep);
  }
});

test('desktop crop still keeps most of the width and the actor', () => {
  const sleep = { x0: 0.26, x1: 0.36, y0: 0.4, y1: 0.7 };
  const focus = sceneFocus(1280, 800, 1600, 893, [0.42, 0.58], { required: [sleep], optional: [] });
  const frame = sceneFrameOf(1280, 800, 1600, 893, focus.x, focus.y);
  inside(frame, sleep);
  assert.ok(frame.x1 - frame.x0 > 0.85, String(frame.x1 - frame.x0));
});

test('scene manifest matches the runtime map and the webp files exist', () => {
  assert.equal(manifest.recipe.resize, false);
  assert.equal(manifest.recipe.quality, 60);
  assert.equal(manifest.portrait.status, 'not-generated');
  for (const scene of manifest.scenes) {
    const meta = SCENE_FILES[scene.source];
    assert.ok(meta, scene.source);
    assert.equal(meta.webp, scene.webp);
    assert.equal(existsSync(new URL('../assets/' + scene.source, import.meta.url)), true);
    assert.equal(existsSync(new URL('../assets/' + scene.webp, import.meta.url)), true);
    if (scene.portrait) assert.equal(meta.portrait, scene.portrait);
    assert.equal(existsSync(new URL('../assets/' + (scene.portrait || 'portrait/missing.jpg'), import.meta.url)), false);
  }
});

test('home.jpg is mapped as unused so it is not the live summer room', () => {
  const choice = chooseSceneFile('home.jpg', true, new Set());
  assert.equal(choice.file, 'home.jpg');
  assert.equal(sandbox.SCENE_FILES['home.jpg'].unused, true);
  assert.equal(sandbox.SCENE_FILES['home_empty.jpg'].portrait, 'portrait/home_empty.jpg');
});
