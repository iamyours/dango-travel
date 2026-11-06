/**
 * Browser checks for scene framing and load races.
 * Run: node tests/scene-load.browser.mjs
 * Needs Google Chrome and a static server. This file starts its own on 8773.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain', '.json': 'application/json' };

function startServer(port) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const file = normalize(join(root, rel.replace(/^\/+/, '')));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    try {
      const body = readFileSync(file);
      res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('missing');
    }
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

async function main() {
  let puppeteer;
  try { puppeteer = createRequire(import.meta.url)('/tmp/node_modules/puppeteer-core'); }
  catch {
    console.log('SKIP browser: puppeteer-core is not installed in this environment');
    return;
  }
  const server = await startServer(8773);
  const browser = await puppeteer.launch({
    executablePath: ['/usr/bin/google-chrome', '/usr/local/bin/google-chrome', '/opt/google/chrome/chrome'].find(p => existsSync(p)),
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  const base = 'http://127.0.0.1:8773/?hour=15&act=tea&season=autumn&lang=zh';

  async function shown() {
    return page.evaluate(() => {
      const layer = document.querySelector('#scene .layer.show');
      const img = layer && layer.querySelector('img.bg');
      const fb = document.getElementById('scene-fallback');
      const scene = document.getElementById('scene').getBoundingClientRect();
      const box = layer ? layer.getBoundingClientRect() : null;
      return {
        src: layer && layer.dataset.src,
        complete: !!(img && img.complete && img.naturalWidth === 1600 && img.naturalHeight === 893),
        fallback: !!(fb && !fb.hidden),
        covers: !!(box && box.left <= 1 && box.top <= 1 && box.right >= scene.width - 1 && box.bottom >= scene.height - 1),
        aspect: box && img && img.naturalWidth ? (box.width / box.height) / (img.naturalWidth / img.naturalHeight) : 0
      };
    });
  }

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  let t0 = Date.now();
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const img = document.querySelector('#scene .layer.show img.bg');
    return img && img.complete && img.naturalWidth === 1600;
  });
  const coldMs = Date.now() - t0;
  const cold = await shown();
  assert.equal(cold.complete, true);
  assert.equal(cold.covers, true);
  assert.ok(Math.abs(cold.aspect - 1) < 0.02, 'stretched ' + cold.aspect);
  assert.ok(!cold.fallback);
  assert.ok(cold.src.includes('assets/opt/bg_living_autumn.webp'), cold.src);

  t0 = Date.now();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const img = document.querySelector('#scene .layer.show img.bg');
    return img && img.complete && img.naturalWidth === 1600;
  });
  // This server sends Cache-Control: no-store, so the reload downloads again.
  // It is not a warm-cache revisit.
  const noStoreReloadMs = Date.now() - t0;
  console.log(JSON.stringify({ coldMs, noStoreReloadMs, coldSrc: cold.src, note: 'no-store reload is not a warm-cache test' }));

  const sizes = [360, 390, 430];
  for (const w of sizes) {
    await page.setViewport({ width: w, height: 844 });
    await page.evaluate(() => document.querySelectorAll('#scene .layer').forEach(placeSceneLayer));
    const fit = await shown();
    assert.equal(fit.covers, true, 'portrait ' + w);
    assert.ok(Math.abs(fit.aspect - 1) < 0.02, 'aspect ' + w);
  }
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluate(() => document.querySelectorAll('#scene .layer').forEach(placeSceneLayer));
  const desk = await shown();
  assert.equal(desk.covers, true, 'desktop');
  const deskFrac = await page.evaluate(() => {
    const box = document.querySelector('#scene .layer.show').getBoundingClientRect();
    return 1280 / box.width;
  });
  assert.ok(deskFrac > 0.85, 'desktop keeps most width ' + deskFrac);
  await page.setViewport({ width: 844, height: 390 });
  await page.evaluate(() => document.querySelectorAll('#scene .layer').forEach(placeSceneLayer));
  const land = await shown();
  assert.equal(land.covers, true, 'landscape');

  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => document.querySelectorAll('#scene .layer').forEach(placeSceneLayer));
  const client = await page.createCDPSession();
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await client.send('Network.emulateNetworkConditions', {
    offline: false, latency: 300,
    downloadThroughput: 400 * 1024 / 8,
    uploadThroughput: 200 * 1024 / 8
  });
  await page.setRequestInterception(true);
  const delays = new Map();
  page.on('request', req => {
    const url = req.url();
    const hit = [...delays.entries()].find(([key]) => url.includes(key));
    if (hit && hit[1] === 'abort') { req.abort(); return; }
    if (hit && typeof hit[1] === 'number') { setTimeout(() => req.continue().catch(() => {}), hit[1]); return; }
    req.continue().catch(() => {});
  });
  delays.set('bg_kitchen', 1400);
  delays.set('bg_balcony', 70);
  delays.set('bg_rain', 'abort');
  const before = await shown();
  assert.ok(before.src.includes('bg_living_autumn'));
  await page.evaluate(() => { goRoom(1); goRoom(1); goRoom(1); });
  await page.waitForFunction(() => {
    const layer = document.querySelector('#scene .layer.show');
    const img = layer && layer.querySelector('img.bg');
    return layer && layer.dataset.src.includes('bg_balcony') && img && img.complete && img.naturalWidth === 1600;
  }, { timeout: 20000 });
  const early = await shown();
  assert.ok(early.src.includes('bg_balcony'), early.src);
  assert.equal(early.complete, true);
  await new Promise(r => setTimeout(r, 1700));
  const afterLate = await shown();
  assert.ok(afterLate.src.includes('bg_balcony'), 'stale kitchen image replaced balcony');

  const kept = afterLate.src;
  await page.evaluate(() => { goRoom(1); });
  await page.waitForFunction(() => {
    const el = document.getElementById('scene-fallback');
    return el && !el.hidden;
  }, { timeout: 8000 });
  const broken = await shown();
  assert.equal(broken.fallback, true);
  assert.equal(broken.src, kept, 'broken request removed the current scene');
  console.log(JSON.stringify({ deskWidthFraction: Number(deskFrac.toFixed(3)), kitchenAfterRace: early.src, keptDuringFailure: broken.src, fallback: broken.fallback }));

  await browser.close();
  server.close();
}

main().catch(err => { console.error(err); process.exit(1); });
