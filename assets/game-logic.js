(function (g) {
  'use strict';

  const FIRST_TRIP_MS = 5 * 60_000;

  function canShortenFirstTrip(save) {
    return save.newJourney === true && !save.firstTripShort && save.tripCount === 0 &&
      (!save.trip || save.trip.phase === 'packed') && !save.lastPack &&
      !save.album?.length && !save.mail?.length &&
      !Object.values(save.visits || {}).some(n => n > 0);
  }

  function purchaseBlock(save, item) {
    if (!item || !(item.p > 0)) return 'unavailable';
    if (item.sv && save.souv.length < item.sv) return 'souvenirs';
    if (save.clover < item.p) return 'clover';
    return '';
  }

  function normalizeTab(tab) {
    if (tab === 'bag') return 'trip';
    if (['diary', 'album', 'keepsakes'].includes(tab)) return 'keeps';
    return ['home', 'trip', 'pond', 'keeps', 'shop'].includes(tab) ? tab : 'home';
  }

  g.DangoLogic = { FIRST_TRIP_MS, canShortenFirstTrip, purchaseBlock, normalizeTab };
})(globalThis);
