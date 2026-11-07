import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

// Synthetic saves only. Run the production loader and departure code without the UI or offline catch-up.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const logic = readFileSync(new URL('../assets/game-logic.js', import.meta.url), 'utf8');
const storageKeys = html.match(/const K3='[^']+',K2='[^']+'/)[0];
const food = html.slice(html.indexOf('const FOODS='), html.indexOf('const CHARMS='));
const loader = html.slice(html.indexOf('const def='), html.indexOf("if(Q.get('fixture')"));
const departure = html.slice(html.indexOf('function departNow('), html.indexOf('function comeHome('));
const MIN = 60_000, HR = 60 * MIN;

function loadFixture(key, fixture, depart = false) {
  const saved = new Map([[key, JSON.stringify(fixture)]]);
  const result = runInNewContext(`${logic}\n${storageKeys};\n${food}\n${loader}\n${departure}
    const loaded = JSON.stringify(S);
    const eligible = DangoLogic.canShortenFirstTrip(S);
    if (depart) departNow(Date.now());
    JSON.stringify({ loaded: JSON.parse(loaded), eligible, after: S });`, {
    localStorage: { getItem: key => saved.get(key) }, MIN, HR, REGROW: 10 * MIN, depart,
    rnd: (a, b) => (a + b) / 2, I18N: { t: key => key }, LOG: [], diary() {}, log() {},
  });
  return JSON.parse(result);
}

const remaining = 43 * MIN + 28_000;

test('fixture-v2: ongoing travel keeps its saved remaining duration on migration', () => {
  const { loaded, eligible } = loadFixture('cozy-tabi-v2', { away: { remain: remaining, food: 'bun', charm: null } });
  assert.equal(loaded.v, 3);
  assert.equal(loaded.migrated, true);
  assert.equal(loaded.newJourney, false);
  assert.equal(loaded.firstTripShort, false);
  assert.deepEqual(loaded.trip, { phase: 'away', remain: remaining, total: remaining, food: 'bun', charm: null });
  assert.equal(eligible, false);
});

test('fixture-v3: legacy in-flight save keeps both remaining and original total', () => {
  const trip = { phase: 'away', food: 'bun', charm: null, remain: remaining, total: HR };
  const { loaded, eligible } = loadFixture('cozy-tabi-v3', { v: 3, trip });
  assert.deepEqual(loaded.trip, trip);
  assert.equal(loaded.newJourney, false);
  assert.equal(loaded.firstTripShort, false);
  assert.equal(eligible, false);
});

test('fixture-first-trip-used: a packed trip cannot reuse firstTripShort even without other history', () => {
  const { loaded, eligible, after } = loadFixture('cozy-tabi-v3', {
    v: 3, newJourney: true, firstTripShort: true, tripCount: 0,
    trip: { phase: 'packed', food: 'bun', charm: null },
  }, true);
  assert.equal(loaded.firstTripShort, true);
  assert.equal(eligible, false);
  assert.equal(after.firstTripShort, true);
  assert.equal(after.trip.phase, 'away');
  assert.equal(after.trip.remain, after.trip.total);
  assert.ok(after.trip.total >= HR && after.trip.total <= 2 * HR);
});
