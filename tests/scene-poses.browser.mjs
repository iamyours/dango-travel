/**
 * Pose visibility, furniture fixture, and scene-switch races.
 * Run: node tests/scene-poses.browser.mjs
 * Byte timings are measured separately; this file does not throttle the network.
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json'
};
const skipSlow = process.env.SKIP_POSES === '1';
const shots = '/opt/cursor/artifacts';
mkdirSync(shots, { recursive: true });

function startServer(port) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname);
    if (rel.startsWith('/dango-travel')) rel = rel.slice('/dango-travel'.length) || '/';
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = normalize(join(root, rel.replace(/^\/+/, '')));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    try {
      const body = readFileSync(file);
      res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'public, max-age=86400' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('missing');
    }
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

const poses = [
  ['sleep', 'autumn', 'bg_living_autumn', 'p_sleep', 'living'],
  ['stretch', 'autumn', 'bg_living_autumn', 'p_stretch', 'living'],
  ['tea', 'autumn', 'bg_living_autumn', 'p_tea', 'living'],
  ['sleep', 'spring', 'bg_living_spring', 'p_sleep', 'living'],
  ['stretch', 'spring', 'bg_living_spring', 'p_stretch', 'living'],
  ['tea', 'spring', 'bg_living_spring', 'p_tea', 'living'],
  ['sleep', 'winter', 'bg_living_winter', 'p_sleep', 'living'],
  ['stretch', 'winter', 'bg_living_winter', 'p_stretch', 'living'],
  ['tea', 'winter', 'bg_living_winter', 'p_tea', 'living'],
  ['sleep', 'summer', 'home_empty', 'p_sleep', 'living'],
  ['stretch', 'summer', 'home_empty', 'p_stretch', 'living'],
  ['tea', 'summer', 'home_empty', 'blob_home', 'living'],
  ['stir', 'autumn', 'bg_kitchen', 'p_stir', 'kitchen'],
  ['read', 'autumn', 'bg_reading', 'p_read', 'reading'],
  ['doze', 'autumn', 'bg_reading', 'p_rest', 'reading'],
  ['water', 'autumn', 'bg_balcony', 'p_water', 'balcony'],
  ['rest', 'autumn', 'bg_balcony', 'p_rest', 'balcony'],
  ['lantern', 'autumn', 'bg_balcony', 'p_lantern', 'balcony'],
  ['umbrella', 'autumn', 'bg_rain', 'p_umbrella', 'porch'],
  ['fish', 'autumn', 'bg_pond', 'p_fish', 'pond']
];

async function main() {
  let puppeteer;
  try { puppeteer = createRequire(import.meta.url)('/tmp/node_modules/puppeteer-core'); }
  catch { console.log('SKIP browser: puppeteer-core is not installed'); return; }
  const server = await startServer(8776);
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (url.startsWith('http://127.0.0.1:8776/')) req.continue().catch(() => {});
    else req.abort().catch(() => {});
  });

  async function measure() {
    return page.evaluate(() => {
      const layer = document.querySelector('#scene .layer.show');
      const actor = layer && layer.querySelector('.actor');
      const img = actor && actor.querySelector('img');
      const scene = document.getElementById('scene').getBoundingClientRect();
      const layers = [...document.querySelectorAll('#scene .layer')];
      if (!actor || !img || !img.naturalWidth) {
        return { present: false, bg: layer && layer.dataset.src, room: layer && layer.dataset.room, layers: layers.length, shown: layers.filter(l => l.classList.contains('show')).length };
      }
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          if (data[(y * c.width + x) * 4 + 3] < 128) continue;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      const er = actor.getBoundingClientRect();
      const sx = er.left + (minX / c.width) * er.width;
      const sy = er.top + (minY / c.height) * er.height;
      const ex = er.left + ((maxX + 1) / c.width) * er.width;
      const ey = er.top + ((maxY + 1) / c.height) * er.height;
      const cx = (sx + ex) / 2;
      const cy = (sy + ey) / 2;
      const hit = document.elementFromPoint(cx, cy);
      return {
        present: true,
        src: img.getAttribute('src'),
        bg: layer.dataset.src,
        room: layer.dataset.room,
        box: { x: Math.round(er.x), y: Math.round(er.y), w: Math.round(er.width), h: Math.round(er.height) },
        opaque: { x: Math.round(sx), y: Math.round(sy), w: Math.round(ex - sx), h: Math.round(ey - sy) },
        inside: sx >= scene.left - 1 && sy >= scene.top - 1 && ex <= scene.right + 1 && ey <= scene.bottom + 1,
        hitActor: !!(hit && hit.closest && hit.closest('.actor')),
        layers: layers.length,
        shown: layers.filter(l => l.classList.contains('show')).length
      };
    });
  }

  async function openPose(width, act, season, tab) {
    await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
    const tabQ = tab === 'pond' ? '&tab=pond' : '';
    await page.goto(`http://127.0.0.1:8776/?hour=15&act=${act}&season=${season}&lang=zh${tabQ}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const img = document.querySelector('#scene .layer.show .actor img');
      return img && img.complete && img.naturalWidth > 0;
    });
  }

  const report = [];
  if (process.env.SKIP_POSES === '1') console.log('skipping pose sweep');
  else for (const width of [360, 390, 430]) {
    for (const [act, season, bg, pose, room] of poses) {
      await openPose(width, act, season, room);
      const row = await measure();
      row.act = act;
      row.season = season;
      row.width = width;
      report.push(row);
      assert.equal(row.present, true, act + ' ' + season + ' ' + width);
      assert.ok(row.bg.includes(bg), row.bg);
      assert.ok(row.src.includes(pose), row.src);
      assert.equal(row.room, room, act + ' room');
      assert.equal(row.inside, true, JSON.stringify(row));
      assert.equal(row.hitActor, true, 'click target ' + act + ' ' + width + ' ' + JSON.stringify(row.box));
      assert.ok(row.opaque.w >= 48 && row.opaque.h >= 48, 'small ' + JSON.stringify(row.opaque));
      assert.equal(row.shown, 1);
    }
  }

  if (!skipSlow) {
  await openPose(390, 'sleep', 'autumn', 'living');
  await page.screenshot({ path: shots + '/scene-sleep-390.png' });
  await page.evaluate(() => document.querySelector('#scene .layer.show .actor').click());
  await page.waitForFunction(() => /p_wave\.png/.test(document.querySelector('#scene .layer.show .actor img').getAttribute('src') || ''));
  const wave = await measure();
  assert.equal(wave.inside, true, 'wave after sleep click');
  assert.equal(wave.hitActor, true, 'wave click target');
  report.push({ ...wave, act: 'wave-from-sleep', season: 'autumn', width: 390, harness: 'click, not a live audit' });

  await openPose(390, 'stretch', 'autumn', 'living');
  await page.screenshot({ path: shots + '/scene-stretch-390.png' });
  await openPose(390, 'tea', 'autumn', 'living');
  await page.screenshot({ path: shots + '/scene-tea-autumn-390.png' });
  await openPose(390, 'stir', 'autumn', 'kitchen');
  await page.screenshot({ path: shots + '/scene-kitchen-stir-390.png' });
  await openPose(390, 'read', 'autumn', 'reading');
  await page.screenshot({ path: shots + '/scene-reading-390.png' });
  await openPose(390, 'water', 'autumn', 'balcony');
  await page.screenshot({ path: shots + '/scene-balcony-390.png' });
  await openPose(390, 'umbrella', 'autumn', 'porch');
  await page.screenshot({ path: shots + '/scene-porch-390.png' });
  await openPose(360, 'sleep', 'autumn', 'living');
  await page.screenshot({ path: shots + '/scene-sleep-360.png' });
  await openPose(430, 'sleep', 'autumn', 'living');
  await page.screenshot({ path: shots + '/scene-sleep-430.png' });

  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:8776/?hour=15&act=sleep&season=autumn&room=kitchen&lang=zh', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const img = document.querySelector('#scene .layer.show img.bg');
    return img && img.complete && img.naturalWidth > 0 && !document.querySelector('#scene .layer.show .actor');
  });
  const emptyKitchen = await page.evaluate(() => {
    const btn = document.getElementById('open-cook');
    const scene = document.getElementById('scene').getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const cx = b.left + b.width / 2;
    const cy = b.top + Math.min(b.height / 2, 80);
    const hit = document.elementFromPoint(cx, cy);
    return {
      actor: !!document.querySelector('#scene .actor'),
      bg: document.querySelector('#scene .layer.show').dataset.src,
      inside: b.left >= scene.left - 1 && b.right <= scene.right + 1 && b.top >= scene.top && b.bottom <= scene.bottom + 1,
      hit: !!(hit && (hit.id === 'open-cook' || (hit.closest && hit.closest('#open-cook')))),
      w: Math.round(b.width),
      h: Math.round(b.height)
    };
  });
  assert.equal(emptyKitchen.actor, false);
  assert.ok(emptyKitchen.bg.includes('bg_kitchen'));
  assert.equal(emptyKitchen.inside, true, JSON.stringify(emptyKitchen));
  assert.equal(emptyKitchen.hit, true, JSON.stringify(emptyKitchen));
  await page.screenshot({ path: shots + '/scene-kitchen-empty-390.png' });

  await page.goto('http://127.0.0.1:8776/?hour=15&act=sleep&season=autumn&room=garden&lang=zh', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const img = document.querySelector('#scene .layer.show img.bg');
    return img && img.complete && /garden/.test(img.getAttribute('src') || '');
  });
  const garden = await page.evaluate(() => {
    const scene = document.getElementById('scene').getBoundingClientRect();
    const seen = el => {
      const b = el.getBoundingClientRect();
      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      return cx >= scene.left && cx <= scene.right && cy >= scene.top && cy <= scene.bottom;
    };
    const clovers = [...document.querySelectorAll('.clover')];
    const mail = document.getElementById('mailbox');
    return {
      actor: !!document.querySelector('.actor'),
      clovers: clovers.length,
      cloversInView: clovers.filter(seen).length,
      luckyInView: clovers.filter(el => el.classList.contains('lucky') && !el.classList.contains('gone')).every(seen),
      mailboxInView: !!(mail && seen(mail))
    };
  });
  assert.equal(garden.actor, false);
  assert.equal(garden.clovers, 8);
  assert.ok(garden.cloversInView >= 4, JSON.stringify(garden));
  assert.equal(garden.luckyInView, true, JSON.stringify(garden));
  await page.screenshot({ path: shots + '/scene-garden-390.png' });

  await page.goto('http://127.0.0.1:8776/?hour=8&act=stretch&season=autumn&fixture=deco&lang=en', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const img = document.querySelector('#scene .layer.show .actor img');
    return img && img.complete && img.naturalWidth > 0 && document.querySelector('#scene .deco');
  });
  await page.click('#decorate');
  await page.waitForFunction(() => document.querySelector('#scene .layer.edit.show .deco'));
  const deco = await page.evaluate(() => {
    const scene = document.getElementById('scene').getBoundingClientRect();
    const items = [...document.querySelectorAll('#scene .layer.show .deco')].map(el => {
      const b = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const cx = Math.min(scene.right - 8, Math.max(scene.left + 8, b.left + b.width / 2));
      const cy = Math.min(scene.bottom - 8, Math.max(scene.top + 8, b.top + b.height / 2));
      const hit = document.elementFromPoint(cx, cy);
      return {
        w: Math.round(b.width),
        h: Math.round(b.height),
        inside: b.right > scene.left + 4 && b.left < scene.right - 4 && b.bottom > scene.top + 4 && b.top < scene.bottom - 4,
        dashed: style.outlineStyle === 'dashed',
        hit: !!(hit && hit.closest && hit.closest('.deco'))
      };
    });
    return { items, help: document.getElementById('decobar').innerText };
  });
  assert.ok(deco.items.length >= 1);
  for (const item of deco.items) {
    assert.equal(item.inside, true, JSON.stringify(item));
    assert.equal(item.dashed, true);
    assert.equal(item.hit, true, JSON.stringify(item));
    assert.ok(item.w >= 48 && item.h >= 48, JSON.stringify(item));
  }
  await page.click('#decobar [data-act="placefurn"]');
  await page.waitForFunction(() => document.querySelectorAll('#scene .layer.show .deco').length >= 2);
  const placed = await page.evaluate(() => {
    const scene = document.getElementById('scene').getBoundingClientRect();
    return [...document.querySelectorAll('#scene .layer.show .deco')].map(el => {
      const b = el.getBoundingClientRect();
      return b.right > scene.left + 4 && b.left < scene.right - 4;
    });
  });
  assert.ok(placed.every(Boolean), JSON.stringify(placed));
  await page.screenshot({ path: shots + '/scene-fixture-deco-390.png' });

  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:8776/dango-travel/?hour=15&act=sleep&season=autumn&lang=zh', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const img = document.querySelector('#scene .layer.show img.bg');
    return img && img.complete && img.naturalWidth === 1600;
  });
  const sub = await measure();
  assert.ok(sub.bg.startsWith('assets/opt/'), sub.bg);
  assert.equal(sub.inside, true);
  const resolved = await page.evaluate(() => document.querySelector('#scene .layer.show img.bg').src);
  assert.ok(resolved.includes('/dango-travel/assets/opt/bg_living_autumn.webp'), resolved);
  writeFileSync(shots + '/pose-report.json', JSON.stringify({ poses: report, garden, emptyKitchen, deco: deco.items, wave: wave.box, subpath: resolved }, null, 2));
  console.log(JSON.stringify({
    poses: report.length,
    sleep390: report.find(r => r.act === 'sleep' && r.season === 'autumn' && r.width === 390),
    stretch390: report.find(r => r.act === 'stretch' && r.width === 390),
    garden,
    emptyKitchen
  }, null, 2));
  }

  const race = await browser.newPage();
  race.setDefaultTimeout(15000);
  await race.setViewport({ width: 390, height: 844 });
  const client = await race.createCDPSession();
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await race.setRequestInterception(true);
  const delays = new Map();
  delays.set('bg_rain', 'abort');
  race.on('request', req => {
    const url = req.url();
    if (!url.startsWith('http://127.0.0.1:8776/')) { req.abort().catch(() => {}); return; }
    const hit = [...delays.entries()].find(([key]) => url.includes(key));
    if (hit && hit[1] === 'abort') { req.abort().catch(() => {}); return; }
    if (hit && typeof hit[1] === 'number') { setTimeout(() => req.continue().catch(() => {}), hit[1]); return; }
    req.continue().catch(() => {});
  });
  await race.goto('http://127.0.0.1:8776/?hour=15&act=tea&season=autumn&lang=zh', { waitUntil: 'domcontentloaded' });
  await race.waitForFunction(() => {
    const img = document.querySelector('#scene .layer.show img.bg');
    return img && img.complete && /living_autumn/.test(img.src);
  });

  async function shown() {
    return race.evaluate(() => {
      const layers = [...document.querySelectorAll('#scene .layer')];
      const layer = document.querySelector('#scene .layer.show');
      const img = layer && layer.querySelector('img.bg');
      const fb = document.getElementById('scene-fallback');
      return {
        src: layer && layer.dataset.src,
        complete: !!(img && img.complete && img.naturalWidth === 1600),
        layers: layers.length,
        shown: layers.filter(l => l.classList.contains('show')).length,
        fallback: !!(fb && !fb.hidden),
        rooms: layers.map(l => l.dataset.room)
      };
    });
  }

  delays.set('bg_reading', 800);
  await race.evaluate(() => dropSceneCache());
  const before = await shown();
  await race.evaluate(() => goRoom(1));
  await new Promise(r => setTimeout(r, 250));
  const pending = await shown();
  assert.ok(pending.src.includes('living_autumn'), pending.src);
  assert.equal(pending.complete, true);
  assert.equal(pending.layers, 1);
  assert.equal(pending.shown, 1);
  await race.waitForFunction(() => /bg_reading/.test((document.querySelector('#scene .layer.show') || {}).dataset?.src || document.querySelector('#scene .layer.show')?.dataset?.src || ''));
  delays.delete('bg_reading');

  function permutations(list) {
    if (list.length <= 1) return [list];
    const out = [];
    list.forEach((item, i) => {
      permutations(list.filter((_, j) => j !== i)).forEach(rest => out.push([item, ...rest]));
    });
    return out;
  }
  const files = ['bg_reading', 'bg_kitchen', 'bg_balcony'];
  for (const order of permutations([90, 180, 320])) {
    files.forEach((file, i) => delays.set(file, order[i]));
    await race.evaluate(() => { dropSceneCache(); room = 'living'; });
    await race.evaluate(() => renderScene(false));
    await race.waitForFunction(() => /living_autumn/.test(document.querySelector('#scene .layer.show')?.dataset?.src || ''));
    await race.evaluate(() => { goRoom(1); goRoom(1); goRoom(1); });
    await race.waitForFunction(() => /bg_balcony/.test(document.querySelector('#scene .layer.show')?.dataset?.src || ''), { timeout: 8000 });
    await new Promise(r => setTimeout(r, 500));
    const done = await shown();
    assert.ok(done.src.includes('bg_balcony'), 'order ' + order.join(',') + ' ' + done.src);
    assert.equal(done.shown, 1, 'duplicate show ' + order.join(','));
    assert.equal(done.layers, 1, 'orphan layers ' + order.join(',') + ' ' + done.rooms.join('|'));
    assert.equal(done.complete, true);
  }
  files.forEach(file => delays.delete(file));

  const kept = (await shown()).src;
  await race.evaluate(() => { dropSceneCache(); goRoom(1); });
  await race.waitForFunction(() => {
    const el = document.getElementById('scene-fallback');
    return el && !el.hidden;
  });
  const broken = await shown();
  assert.equal(broken.fallback, true);
  assert.equal(broken.src, kept);
  assert.equal(broken.complete, true);
  delays.delete('bg_rain');
  await race.evaluate(() => { dropSceneCache(); document.querySelector('#scene-fallback button').click(); });
  await race.waitForFunction(() => /bg_rain/.test(document.querySelector('#scene .layer.show')?.dataset?.src || ''));
  const recovered = await shown();
  assert.equal(recovered.fallback, false);
  assert.ok(recovered.src.includes('bg_rain'));
  assert.equal(recovered.complete, true);
  assert.equal(recovered.layers, 1);

  delays.set('bg_reading', 1600);
  await race.evaluate(() => { dropSceneCache(); room = 'living'; renderScene(false); });
  await race.waitForFunction(() => /living_autumn/.test(document.querySelector('#scene .layer.show')?.dataset?.src || ''));
  await race.evaluate(() => { goRoom(1); setTab('pond'); enterPondFull(); });
  await new Promise(r => setTimeout(r, 1900));
  const pond = await race.evaluate(() => ({
    full: document.body.classList.contains('pond-full'),
    frame: !!document.getElementById('pondframe'),
    layers: [...document.querySelectorAll('#scene .layer')].map(l => l.dataset.src || '')
  }));
  assert.equal(pond.full, true);
  assert.equal(pond.frame, true);
  assert.ok(pond.layers.every(src => !src.includes('bg_reading')), JSON.stringify(pond));
  delays.delete('bg_reading');

  delays.set('bg_kitchen', 1400);
  await race.evaluate(() => { dropSceneCache(); exitPondFull(); tab = 'home'; room = 'living'; renderScene(false); });
  await race.waitForFunction(() => /living_autumn/.test(document.querySelector('#scene .layer.show')?.dataset?.src || ''));
  await race.evaluate(() => { goRoom(1); goRoom(1); setTab('keeps'); });
  await race.waitForFunction(() => /living_autumn|home_empty/.test(document.querySelector('#scene .layer.show')?.dataset?.src || ''));
  await new Promise(r => setTimeout(r, 1700));
  const keeps = await shown();
  assert.ok(/living_autumn|home_empty/.test(keeps.src), keeps.src);
  assert.equal(keeps.shown, 1);

  console.log('races ok');
  await browser.close();
  server.close();
}

main().catch(err => { console.error(err); process.exit(1); });
