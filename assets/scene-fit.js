/* Scene framing, optional portrait sources, and WebP derivatives.
   Landscape JPEG sources stay 1600x893. The page asks for assets/opt/*.webp
   when that path is listed in HAVE, and falls back to the JPEG.
   Portrait files are used only after their path is listed in HAVE.
   Regenerate derivatives with tools/optimize-scenes.py. See assets/scene-sources.json.
   None of the portrait files are in the tree yet. */
(function (g) {
  'use strict';

  // focus is [x, y] in 0..1 of the source. It is the fallback when the room
  // has no actor. While a pose is on screen, sceneFocus recenters the crop
  // on that pose so the sprite stays inside the phone viewport.
  var SCENE_FILES = {
    'garden.jpg': { portrait: 'portrait/garden.jpg', webp: 'opt/garden.webp', focus: [0.39, 0.72] },
    'home_empty.jpg': { portrait: 'portrait/home_empty.jpg', webp: 'opt/home_empty.webp', focus: [0.42, 0.58] },
    'bg_living_spring.jpg': { portrait: 'portrait/bg_living_spring.jpg', webp: 'opt/bg_living_spring.webp', focus: [0.46, 0.58] },
    'bg_living_autumn.jpg': { portrait: 'portrait/bg_living_autumn.jpg', webp: 'opt/bg_living_autumn.webp', focus: [0.42, 0.58] },
    'bg_living_winter.jpg': { portrait: 'portrait/bg_living_winter.jpg', webp: 'opt/bg_living_winter.webp', focus: [0.55, 0.58] },
    'bg_reading.jpg': { portrait: 'portrait/bg_reading.jpg', webp: 'opt/bg_reading.webp', focus: [0.68, 0.55] },
    'bg_kitchen.jpg': { portrait: 'portrait/bg_kitchen.jpg', webp: 'opt/bg_kitchen.webp', focus: [0.28, 0.58] },
    'bg_balcony.jpg': { portrait: 'portrait/bg_balcony.jpg', webp: 'opt/bg_balcony.webp', focus: [0.22, 0.55] },
    'bg_rain.jpg': { portrait: 'portrait/bg_rain.jpg', webp: 'opt/bg_rain.webp', focus: [0.40, 0.55] },
    'bg_pond.jpg': { portrait: 'portrait/bg_pond.jpg', webp: 'opt/bg_pond.webp', focus: [0.58, 0.64] },
    // home.jpg has a baked-in Dango. The live summer room uses home_empty.jpg.
    'home.jpg': { webp: 'opt/home.webp', focus: [0.55, 0.58], unused: true }
  };

  function has(have, file) {
    return !!(file && have && typeof have.has === 'function' && have.has(file));
  }

  function coverRect(vw, vh, iw, ih, fx, fy) {
    if (!(vw > 0 && vh > 0 && iw > 0 && ih > 0)) {
      return { left: 0, top: 0, width: Math.max(0, vw), height: Math.max(0, vh) };
    }
    fx = fx == null ? 0.5 : fx;
    fy = fy == null ? 0.56 : fy;
    var scale = Math.max(vw / iw, vh / ih);
    var w = iw * scale;
    var h = ih * scale;
    var left = vw * 0.5 - fx * w;
    var top = vh * 0.5 - fy * h;
    if (left > 0) left = 0;
    if (top > 0) top = 0;
    if (left < vw - w) left = vw - w;
    if (top < vh - h) top = vh - h;
    return { left: left, top: top, width: w, height: h };
  }

  function visibleFraction(vw, vh, iw, ih) {
    var scale = Math.max(vw / iw, vh / ih);
    return { x: vw / (iw * scale), y: vh / (ih * scale) };
  }

  function clampFocus(mid, vis) {
    if (!(vis > 0)) return 0.5;
    if (vis >= 0.999) return Math.min(1, Math.max(0, mid));
    var half = vis / 2;
    return Math.min(1 - half, Math.max(half, mid));
  }

  function bestCluster(spans, vis) {
    if (!spans.length) return null;
    var items = spans.map(function (s) {
      return { a: s[0], b: s[1], c: (s[0] + s[1]) / 2 };
    });
    items.sort(function (a, b) { return a.c - b.c || a.a - b.a; });
    var best = null;
    for (var i = 0; i < items.length; i++) {
      var lo = items[i].a;
      var hi = items[i].b;
      var n = 1;
      if (!best || n > best.n) best = { lo: lo, hi: hi, n: n };
      for (var j = i + 1; j < items.length; j++) {
        var nlo = Math.min(lo, items[j].a);
        var nhi = Math.max(hi, items[j].b);
        if (nhi - nlo > vis + 1e-4) break;
        lo = nlo;
        hi = nhi;
        n++;
        if (!best || n > best.n || (n === best.n && (hi - lo) < (best.hi - best.lo))) {
          best = { lo: lo, hi: hi, n: n };
        }
      }
    }
    return best;
  }

  function containAxis(vis, required, optional, base) {
    if (!(vis > 0)) return base;
    if (vis >= 0.999) return clampFocus(base == null ? 0.5 : base, vis);
    var spans = (required || []).filter(function (s) { return s && s[1] > s[0]; });
    var extra = (optional || []).filter(function (s) { return s && s[1] > s[0]; });
    if (!spans.length) {
      var cluster = bestCluster(extra, vis);
      if (!cluster) return clampFocus(base == null ? 0.5 : base, vis);
      return clampFocus((cluster.lo + cluster.hi) / 2, vis);
    }
    var lo = spans[0][0];
    var hi = spans[0][1];
    for (var i = 1; i < spans.length; i++) {
      lo = Math.min(lo, spans[i][0]);
      hi = Math.max(hi, spans[i][1]);
    }
    var rest = extra.map(function (s) {
      return { s: s, d: Math.abs((s[0] + s[1]) / 2 - (lo + hi) / 2) };
    });
    rest.sort(function (a, b) { return a.d - b.d; });
    for (var k = 0; k < rest.length; k++) {
      var nlo = Math.min(lo, rest[k].s[0]);
      var nhi = Math.max(hi, rest[k].s[1]);
      if (nhi - nlo <= vis + 1e-4) {
        lo = nlo;
        hi = nhi;
      }
    }
    return clampFocus((lo + hi) / 2, vis);
  }

  // groups.required boxes stay inside the crop when they fit.
  // groups.optional boxes are added from nearest to farthest while the
  // union still fits. Boxes are {x0,x1,y0,y1} in 0..1 of the source.
  function sceneFocus(vw, vh, iw, ih, base, groups) {
    base = base || [0.5, 0.56];
    groups = groups || {};
    var req = groups.required || [];
    var opt = groups.optional || [];
    var vis = visibleFraction(vw, vh, iw, ih);
    return {
      x: containAxis(vis.x, req.map(function (b) { return [b.x0, b.x1]; }), opt.map(function (b) { return [b.x0, b.x1]; }), base[0]),
      y: containAxis(vis.y, req.map(function (b) { return [b.y0, b.y1]; }), opt.map(function (b) { return [b.y0, b.y1]; }), base[1]),
      visX: vis.x,
      visY: vis.y
    };
  }

  function frameOf(vw, vh, iw, ih, fx, fy) {
    var rect = coverRect(vw, vh, iw, ih, fx, fy);
    return {
      rect: rect,
      x0: (0 - rect.left) / rect.width,
      x1: (vw - rect.left) / rect.width,
      y0: (0 - rect.top) / rect.height,
      y1: (vh - rect.top) / rect.height
    };
  }

  function chooseSceneFile(file, portraitMode, have) {
    var meta = SCENE_FILES[file] || { focus: [0.5, 0.56] };
    var focus = meta.focus || [0.5, 0.56];
    var source = file;
    var kind = 'landscape';
    var webp = meta.webp || null;
    if (portraitMode && meta.portrait && has(have, meta.portrait)) {
      source = meta.portrait;
      kind = 'portrait';
      webp = meta.portraitWebp || null;
    }
    if (webp && has(have, webp)) {
      return { file: webp, fallback: source, focus: focus, kind: kind, encoded: 'webp' };
    }
    return { file: source, fallback: source, focus: focus, kind: kind, encoded: 'original' };
  }

  g.SCENE_FILES = SCENE_FILES;
  g.sceneCoverRect = coverRect;
  g.sceneFocus = sceneFocus;
  g.sceneFrameOf = frameOf;
  g.chooseSceneFile = chooseSceneFile;
})(typeof globalThis !== 'undefined' ? globalThis : this);
