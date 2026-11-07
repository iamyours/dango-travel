(function (g) {
  'use strict';

  const rooms = {
    'bg_living_autumn.jpg': { id: 'A_living_autumn', file: 'portrait/bg_living_autumn.webp', focus: [.5, .63], pose: ['sleep', 'tea', 'stretch', 'stand'] },
    'bg_kitchen.jpg': { id: 'B_kitchen', file: 'portrait/bg_kitchen.webp', focus: [.5, .59], pose: ['stove', 'table', 'cook_stand'] }
  };
  const itemIds = {
    bun: 'food_mugwort_dango', onigiri: 'food_nori_onigiri', bento: 'food_forest_bento',
    vbento: 'food_tomato_basil_rice', cbento: 'food_carrot_bento', jam: 'food_strawberry_jam_bread',
    acorn: 'charm_acorn', bell: 'charm_bell', shell: 'charm_blue_shell',
    basil: 'seed_basil', tomato: 'seed_tomato', carrot: 'seed_carrot', strawberry: 'seed_strawberry',
    rug: 'furn_round_rug', shelf: 'furn_bookshelf', monstera: 'furn_monstera', painting: 'furn_forest_painting',
    lamp: 'furn_floor_lamp', rocker: 'furn_rocking_chair', radio: 'furn_vintage_radio',
    hanging: 'furn_hanging_planter', cushion: 'furn_cushion',
    backpack: 'misc_travel_backpack', postcard: 'misc_postcard', gift: 'misc_gift_box'
  };

  function readCatalog(manifest) {
    const scenes = new Map(), tiles = new Map();
    for (const [source, spec] of Object.entries(rooms)) {
      const entry = manifest?.assets?.find(a => a.kind === 'scene' && a.id === spec.id);
      const anchors = entry?.anchors_normalized;
      const unit = n => Number.isFinite(n) && n >= 0 && n <= 1;
      const floor = anchors?.usable_floor;
      if (entry?.outputs?.some(o => o.size?.[0] === 720 && o.size?.[1] === 1560) &&
          spec.pose.every(k => unit(anchors?.[k]?.x) && unit(anchors?.[k]?.y)) &&
          floor && [floor.x0, floor.x1, floor.y0, floor.y1].every(unit) && floor.x0 < floor.x1 && floor.y0 < floor.y1) {
        scenes.set(source, { file: spec.file, focus: spec.focus, anchors });
      }
    }
    for (const [gameId, id] of Object.entries(itemIds)) {
      const file = `tiles/${id}.webp`;
      if (manifest?.items?.some(t => t.id === id && t.usable === true && t.tile_webp === file)) tiles.set(gameId, file);
    }
    return { scenes, tiles };
  }

  // Check availability separately so a missing optional asset never becomes an image request.
  function availability(probe) {
    const cache = new Map();
    return file => {
      if (!cache.has(file)) cache.set(file, Promise.resolve().then(() => probe(file)).catch(() => false));
      return cache.get(file);
    };
  }

  g.DangoArt = { readCatalog, availability };
})(globalThis);
