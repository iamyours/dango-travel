/**
 * Settled full-color screenshots, garden paging, and the furniture fixture.
 * Run: node tests/scene-reach.browser.mjs
 */
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = '/opt/cursor/artifacts';
mkdirSync(shots, { recursive: true });
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json'
};

function startServer(port) {
  const server = createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (rel === '/') rel = '/index.html';
    const file = normalize(join(root, rel.replace(/^\/+/, '')));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    try {
      const body = readFileSync(file);
      res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

function colorStats(file) {
  const out = execFileSync('python3', ['-c', `
from PIL import Image, ImageStat, ImageFilter
im=Image.open(${JSON.stringify(file)}).convert('RGB').crop((50,180,340,640))
st=ImageStat.Stat(im)
ed=ImageStat.Stat(im.filter(ImageFilter.FIND_EDGES))
print(round(sum(st.stddev)/3,1), round(sum(ed.mean)/3,1))
`]).toString().trim().split(/\s+/).map(Number);
  return { std: out[0], edge: out[1] };
}

function outlinePixels(file) {
  return Number(execFileSync('python3', ['-c', `
from PIL import Image
im=Image.open(${JSON.stringify(file)}).convert('RGB')
px=im.load(); w,h=im.size
n=0
for y in range(160, 680):
  for x in range(24, w-24):
    r,g,b=px[x,y]
    dashed=abs(r-232)<36 and abs(g-106)<36 and abs(b-85)<40 and r>g+60
    selected=abs(r-79)<36 and abs(g-127)<36 and abs(b-58)<36 and g>r+20
    if dashed or selected: n+=1
print(n)
`]).toString().trim());
}

async function main() {
  const puppeteer = createRequire(import.meta.url)('/tmp/node_modules/puppeteer-core');
  const server = await startServer(8778);
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url().startsWith('http://127.0.0.1:8778/')) req.continue().catch(() => {});
    else req.abort().catch(() => {});
  });

  async function settled() {
    await page.waitForFunction(() => {
      const layer = document.querySelector('#scene .layer.show');
      const img = layer && layer.querySelector('img.bg');
      return layer && img && img.naturalWidth > 0 && getComputedStyle(layer).opacity === '1';
    });
    await new Promise(r => setTimeout(r, 80));
  }

  async function shot(name) {
    await settled();
    const file = shots + '/' + name;
    await page.screenshot({ path: file });
    const stats = colorStats(file);
    assert.ok(stats.std > 40 && stats.edge > 25, name + ' looks faded ' + JSON.stringify(stats));
    return stats;
  }

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  const scenes = [
    ['scene-sleep-390.png', 'hour=15&act=sleep&season=autumn'],
    ['scene-stretch-390.png', 'hour=8&act=stretch&season=autumn'],
    ['scene-tea-autumn-390.png', 'hour=15&act=tea&season=autumn'],
    ['scene-kitchen-stir-390.png', 'hour=9&act=stir&season=autumn'],
    ['scene-kitchen-empty-390.png', 'hour=15&act=sleep&season=autumn&room=kitchen']
  ];
  const colors = {};
  for (const [name, q] of scenes) {
    await page.goto('http://127.0.0.1:8778/?' + q + '&lang=zh', { waitUntil: 'domcontentloaded' });
    colors[name] = await shot(name);
  }

  const reach = [];
  for (const width of [360, 390, 430]) {
    await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
    for (let lucky = 0; lucky < 8; lucky++) {
      await page.goto('http://127.0.0.1:8778/?hour=15&act=sleep&season=autumn&room=garden&lang=zh', { waitUntil: 'domcontentloaded' });
      await settled();
      await page.evaluate(i => {
        S.grow = Array(8).fill(0);
        S.cloverKind = Array(8).fill(1);
        S.cloverKind[i] = 2;
        S.clover = 20;
        S.mail = [{ id: 'train', n: 1, sv: '🍄 小蘑菇', cl: 3, t: Date.now() }];
        gardenPage = 0;
        renderScene(false);
      }, lucky);
      await page.waitForFunction(() => {
        const layer = document.querySelector('#scene .layer.show');
        return layer && layer.dataset.gpage === '0' && getComputedStyle(layer).opacity === '1';
      });
      const seen = new Map();
      let overlap = false;
      for (let step = 0; step < 6; step++) {
        const pageInfo = await page.evaluate(() => {
          const scene = document.getElementById('scene').getBoundingClientRect();
          const nodes = [...document.querySelectorAll('#scene .layer.show .clover:not(.gone)'), document.getElementById('mailbox')].filter(Boolean);
          const rects = nodes.map(el => {
            const b = el.getBoundingClientRect();
            const cx = b.left + b.width / 2;
            const cy = b.top + b.height / 2;
            const hit = document.elementFromPoint(cx, cy);
            const id = el.id === 'mailbox' ? 'mail' : 'c' + el.dataset.i;
            const full = b.left >= scene.left + 1 && b.right <= scene.right - 1 && b.top >= scene.top + 1 && b.bottom <= scene.bottom - 1;
            const mine = hit && hit.closest && (hit.closest('.clover') === el || hit.closest('#mailbox') === el);
            return { id, full, mine, w: b.width, h: b.height, x: b.left, y: b.top, r: b.right, btm: b.bottom };
          });
          let hitOverlap = false;
          const inside = rects.filter(r => r.full);
          for (let a = 0; a < inside.length; a++) {
            for (let b = a + 1; b < inside.length; b++) {
              const A = inside[a], B = inside[b];
              if (A.x < B.r - 1 && A.r > B.x + 1 && A.y < B.btm - 1 && A.btm > B.y + 1) hitOverlap = true;
            }
          }
          return {
            rects,
            hitOverlap,
            more: (() => { const n = document.querySelector('#room-next .more'); return n && !n.hidden ? n.textContent : ''; })()
          };
        });
        if (pageInfo.hitOverlap) overlap = true;
        for (const rect of pageInfo.rects) {
          if (rect.full && rect.mine && rect.w >= 48 && rect.h >= 48) seen.set(rect.id, true);
        }
        if (width === 390 && lucky === 0) {
          await page.screenshot({ path: `${shots}/scene-garden-390-p${step}.png` });
          const stats = colorStats(`${shots}/scene-garden-390-p${step}.png`);
          assert.ok(stats.std > 40 && stats.edge > 25, 'garden page faded ' + JSON.stringify(stats));
        }
        if (!pageInfo.more) break;
        await page.click('#room-next');
        await page.waitForFunction(step => {
          const layer = document.querySelector('#scene .layer.show');
          return layer && layer.dataset.gpage === String(step) && getComputedStyle(layer).opacity === '1';
        }, {}, step + 1);
      }
      const missing = ['c0','c1','c2','c3','c4','c5','c6','c7','mail'].filter(id => !seen.get(id));
      assert.equal(overlap, false, 'overlap ' + width + ' lucky ' + lucky);
      assert.deepEqual(missing, [], 'missing ' + width + ' lucky ' + lucky + ' ' + missing.join(','));
      await page.evaluate(() => { gardenPage = 0; renderScene(false); });
      await page.waitForFunction(() => document.querySelector('#scene .layer.show')?.dataset.gpage === '0' && getComputedStyle(document.querySelector('#scene .layer.show')).opacity === '1');
      let guard = 0;
      while (guard++ < 6) {
        const ready = await page.evaluate(i => {
          const el = document.querySelector('#scene .layer.show .clover[data-i="' + i + '"]');
          if (!el || el.classList.contains('gone')) return false;
          const b = el.getBoundingClientRect();
          const scene = document.getElementById('scene').getBoundingClientRect();
          return b.left >= scene.left && b.right <= scene.right;
        }, lucky);
        if (ready) break;
        await page.click('#room-next');
        await page.waitForFunction(step => {
          const layer = document.querySelector('#scene .layer.show');
          return layer && Number(layer.dataset.gpage) === step && getComputedStyle(layer).opacity === '1';
        }, {}, guard);
      }
      const before = await page.evaluate(() => S.clover);
      await page.evaluate(i => document.querySelector('#scene .layer.show .clover[data-i="' + i + '"]').click(), lucky);
      await new Promise(r => setTimeout(r, 50));
      const afterLucky = await page.evaluate(i => ({ clover: S.clover, gone: S.grow[i] > 0, kind: S.cloverKind[i] }), lucky);
      assert.equal(afterLucky.clover, before + 4, 'lucky payout ' + lucky);
      assert.equal(afterLucky.gone, true);
      await page.evaluate(step => { gardenPage = step; renderScene(false); }, 0);
      await settled();
      guard = 0;
      while (guard++ < 6) {
        const ready = await page.evaluate(() => {
          const el = document.getElementById('mailbox');
          const b = el.getBoundingClientRect();
          const scene = document.getElementById('scene').getBoundingClientRect();
          return b.left >= scene.left && b.right <= scene.right && b.top >= scene.top && b.bottom <= scene.bottom;
        });
        if (ready) break;
        await page.click('#room-next');
        await page.waitForFunction(step => {
          const layer = document.querySelector('#scene .layer.show');
          return layer && Number(layer.dataset.gpage) === step && getComputedStyle(layer).opacity === '1';
        }, {}, guard);
      }
      await page.evaluate(() => document.getElementById('mailbox').click());
      await page.waitForFunction(() => document.body.classList.contains('sheet-open') && S.mail.length === 0);
      reach.push({ width, lucky, ok: true });
    }
  }

  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:8778/?hour=8&act=stretch&season=autumn&fixture=deco&lang=en', { waitUntil: 'domcontentloaded' });
  await settled();
  await page.click('#decorate');
  await page.waitForFunction(() => document.querySelector('#scene .layer.edit.show .deco'));
  await settled();
  await page.click('#decobar [data-act="placefurn"]');
  await page.waitForFunction(() => document.querySelectorAll('#scene .layer.show .deco').length >= 2);
  await settled();
  const deco = await page.evaluate(() => {
    const scene = document.getElementById('scene').getBoundingClientRect();
    return [...document.querySelectorAll('#scene .layer.show .deco')].map(el => {
      const b = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const cx = Math.min(scene.right - 12, Math.max(scene.left + 12, b.left + b.width / 2));
      const cy = Math.min(scene.bottom - 12, Math.max(scene.top + 12, b.top + b.height / 2));
      const hit = document.elementFromPoint(cx, cy);
      return {
        w: Math.round(b.width), h: Math.round(b.height),
        inside: b.left >= scene.left && b.right <= scene.right && b.top >= scene.top && b.bottom <= scene.bottom,
        dashed: style.outlineStyle === 'dashed' && parseFloat(style.outlineWidth) >= 3,
        hit: !!(hit && hit.closest && hit.closest('.deco')),
        sel: el.classList.contains('sel')
      };
    });
  });
  assert.ok(deco.some(item => item.sel && item.dashed && item.hit && item.inside), JSON.stringify(deco));
  await page.screenshot({ path: shots + '/scene-fixture-deco-390.png' });
  const dashes = outlinePixels(shots + '/scene-fixture-deco-390.png');
  assert.ok(dashes >= 80, 'dashed outline pixels ' + dashes);
  const decoColor = colorStats(shots + '/scene-fixture-deco-390.png');
  assert.ok(decoColor.std > 40 && decoColor.edge > 25, JSON.stringify(decoColor));

  console.log(JSON.stringify({ colors, reach: reach.length, dashes, decoColor, deco }, null, 2));
  await browser.close();
  server.close();
}

main().catch(err => { console.error(err); process.exit(1); });
