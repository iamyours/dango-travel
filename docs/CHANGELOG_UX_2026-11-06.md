# 2026-11-06 — v0 Playable UX

- Shop is the fifth tab. Buy food, charms, seeds and furniture directly, even while Dango is away. The shop reports missing clovers or souvenirs without charging for a failed purchase.
- Trip is for packing food you own and an optional charm. Departure stays disabled until there is valid food in the bag, with the reason beside the button. While away, Trip shows time remaining and shortcuts to Home, Pond, Shop and Keepsakes.
- The first departure on a new save takes five game minutes. Existing saves and trips already in progress keep their normal timing.
- The shell shows one language at a time. Selected packing cards have a ring and checkmark; controls have at least 48 px tap targets.
- Exiting the full-screen koi pond restores the Pond preview and its entry button. The activity pill names the room when Dango is elsewhere.
- Locked postcards show a destination hint, a Go to Trip shortcut, and diary progress out of three for that destination.
- The previous scene and item art remains the default. See [implementation notes](../IMPLEMENTATION_NOTES.md).

## R1 playtest follow-up

- R1 run `2026-11-06T17-26-49-546Z-87741` passed all phases in a clean headless Chrome profile: food purchase, the food-selection gate, departure, return after 300.6 seconds of real time, gift collection, and persistence after reload.
- Garden count badges now fit inside the room arrows without changing their tap targets or accessible names.
- Trip shows “Dango is home” with the Open Gifts action instead of packing controls when gifts are waiting. While gifts are open, the departure controls stay hidden; closing the gift sheet restores packing. The return notification no longer lingers after opening gifts.

## R2 visual review follow-up

- Shop replaces the long catalog with four category chips: Food, Seeds, Charms, and Furniture. Compact cards separate item details from the price and buy action, and the stock list scrolls above the bottom navigation.
- Unaffordable or souvenir-gated items show what is missing beside the disabled buy button. Buying still updates ownership immediately; selecting a bought item for a trip does not buy it again.
- Existing art, travel timing, and gifts behavior are unchanged.

## R2 harness follow-up — 2026-11-06

- The extended runner’s animated garden target is now clicked with `force: true`, and transient duplicate scene layers are handled with `.first()` in the runner assertions.
- `scene-poses.browser.mjs` and `scene-reach.browser.mjs` now write screenshots to `DANGO_ARTIFACTS` or their local `artifacts` fallback. No game logic changed.
- Follow-up execution was blocked by command approval in the environment; the requested fresh browser and archive results are therefore not claimed here.
