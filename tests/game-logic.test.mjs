import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import '../assets/game-logic.js';

const { FIRST_TRIP_MS, canShortenFirstTrip, purchaseBlock, normalizeTab } = globalThis.DangoLogic;

test('a fresh save can take one five-minute trip, including after packing', () => {
  const fresh = { newJourney: true, tripCount: 0 };
  assert.equal(FIRST_TRIP_MS, 5 * 60_000);
  assert.equal(canShortenFirstTrip(fresh), true);
  assert.equal(canShortenFirstTrip({ ...fresh, trip: { phase: 'packed' } }), true);
  for (const history of [
    { newJourney: false }, { newJourney: undefined }, { firstTripShort: true },
    { tripCount: 1 }, { trip: { phase: 'away' } }, { lastPack: { food: 'bun' } },
    { visits: { train: 1 } }, { album: [{ id: 'train' }] }, { mail: [{ id: 'train' }] },
  ]) {
    assert.equal(canShortenFirstTrip({ ...fresh, ...history }), false);
  }
});

test('purchase checks availability, souvenirs and clovers without mutating the save', () => {
  const save = { clover: 20, souv: [] };
  const furniture = { p: 30, sv: 1 };
  assert.equal(purchaseBlock(save, undefined), 'unavailable');
  assert.equal(purchaseBlock(save, { cook: { tomato: 1 } }), 'unavailable');
  assert.equal(purchaseBlock(save, furniture), 'souvenirs');
  assert.equal(purchaseBlock({ ...save, souv: ['leaf'] }, furniture), 'clover');
  assert.equal(purchaseBlock({ clover: 30, souv: ['leaf'] }, furniture), '');
  assert.equal(purchaseBlock(save, { p: 20 }), '');
  assert.deepEqual(save, { clover: 20, souv: [] });
});

test('Shop is a distinct tab and old travel and collection links still resolve', () => {
  for (const tab of ['home', 'trip', 'pond', 'keeps', 'shop']) assert.equal(normalizeTab(tab), tab);
  assert.equal(normalizeTab('bag'), 'trip');
  for (const tab of ['diary', 'album', 'keepsakes']) assert.equal(normalizeTab(tab), 'keeps');
  assert.equal(normalizeTab('missing'), 'home');
});

test('the game shell keeps the legacy art as the default', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>(const HAVE[\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'the game script and its art manifest are present');
  assert.doesNotThrow(() => new Script(script));
  const manifest = script.slice(0, script.indexOf(';'));
  assert.match(manifest, /"garden\.jpg"/);
  assert.match(manifest, /"opt\/garden\.webp"/);
  assert.doesNotMatch(manifest, /(?:portrait|tiles)\//);
  for (const entry of ['../index.html', '../koi/index.html', '../assets/game-logic.js', '../assets/scene-fit.js']) {
    assert.doesNotMatch(readFileSync(new URL(entry, import.meta.url), 'utf8'), /batch-art(?:\.js)?/);
  }
});
