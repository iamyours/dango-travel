/* Scene framing and optional portrait sources.
   Landscape files stay 1600x893. Portrait files are used only after their
   path is listed in HAVE, so a missing replacement is never requested. */
(function (g) {
  'use strict';

  // focus is [x, y] in 0..1 of the source image. It is an interim crop for
  // landscape art on a portrait phone. It cannot keep both ends of a wide room.
  var SCENE_FILES = {
    'garden.jpg': { portrait: 'portrait/garden.jpg', focus: [0.36, 0.70] },
    'home_empty.jpg': { portrait: 'portrait/home_empty.jpg', focus: [0.50, 0.58] },
    'bg_living_spring.jpg': { portrait: 'portrait/bg_living_spring.jpg', focus: [0.52, 0.58] },
    'bg_living_autumn.jpg': { portrait: 'portrait/bg_living_autumn.jpg', focus: [0.52, 0.58] },
    'bg_living_winter.jpg': { portrait: 'portrait/bg_living_winter.jpg', focus: [0.38, 0.58] },
    'bg_reading.jpg': { portrait: 'portrait/bg_reading.jpg', focus: [0.68, 0.55] },
    'bg_kitchen.jpg': { portrait: 'portrait/bg_kitchen.jpg', focus: [0.40, 0.55] },
    'bg_balcony.jpg': { portrait: 'portrait/bg_balcony.jpg', focus: [0.34, 0.52] },
    'bg_rain.jpg': { portrait: 'portrait/bg_rain.jpg', focus: [0.38, 0.55] },
    'bg_pond.jpg': { portrait: 'portrait/bg_pond.jpg', focus: [0.55, 0.64] },
    // home.jpg has a baked-in Dango. The live summer room uses home_empty.jpg.
    'home.jpg': { focus: [0.55, 0.58], unused: true }
  };

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

  function chooseSceneFile(file, portraitMode, have) {
    var meta = SCENE_FILES[file] || { focus: [0.5, 0.56] };
    if (portraitMode && meta.portrait && have && typeof have.has === 'function' && have.has(meta.portrait)) {
      return { file: meta.portrait, focus: meta.focus, kind: 'portrait' };
    }
    return { file: file, focus: meta.focus || [0.5, 0.56], kind: 'landscape' };
  }

  g.SCENE_FILES = SCENE_FILES;
  g.sceneCoverRect = coverRect;
  g.chooseSceneFile = chooseSceneFile;
})(typeof globalThis !== 'undefined' ? globalThis : this);
