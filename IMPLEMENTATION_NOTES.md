# Implementation notes — 2026-11-06

## Art decision: batch1 rejected

The batch1 portraits, tiles, and `assets/batch-art.js` are rejected for the default game. The files are not removed, but the page does not import `batch-art.js`, register the new assets in `HAVE`, or change `assets/scene-fit.js` to prefer them. Existing JPEG/`opt` backgrounds and the original item graphics remain the defaults.

## State and navigation

- `DangoLogic` owns tab aliases, purchase validation, and the first-trip eligibility check. A fresh save opts in via `newJourney`; older saves that lack the flag do not. The first real departure writes `firstTripShort` and persists the five-minute trip immediately. Already-away state is not rewritten.
- Shop is the only purchase step; departure consumes existing inventory. The same Shop destination handles `?tab=shop`, the pond’s `dango-goto` message, and the empty furniture shortcut.
- The away timer updates in place rather than rebuilding the Trip board every second. Keepsakes progress is calculated from visits to each individual place and capped at three.

## R1 evidence and fixes

- R1 `2026-11-06T17-26-49-546Z-87741` used a fresh temporary Chrome profile on `127.0.0.1:4174`, in Chinese at 390 × 844. All phases passed; the 5-clover bun purchase changed the balance from 20 to 15 and stock from 1 to 2. The first trip returned after 300.6 seconds of real time; the balance, postcard progress, and souvenir persisted across reload. Offline ad pings were non-blocking.
- Garden count badges fit inside the room arrows without changing their tap targets or accessible names. The return/gift state uses the pending-mail state and does not expose packing controls while the gift sheet is open.

## R2 visual review and follow-up

- R2 run `2026-11-06T17-38-17-025Z-94629` verified the real-time return and gifts flow before the Shop redesign. Its raw evidence is unchanged.
- Shop now shows one category at a time. Four pressed-state chips sit above the scrollable inventory. Compact item cards show ownership and put the price on a 48 px buy control. The inventory stops above the bottom navigation; its scroll position is preserved when a purchase updates the list.
- The render and purchase paths share `purchaseBlock`. Unaffordable and souvenir-gated items show localized reasons beside their disabled buttons; the buy handler still validates before debiting. Stock and price rules are unchanged.

## R2 follow-up harness changes

- `round1/driver/r2-extended.mjs` now force-clicks the garden clover target, whose CSS sway animation can prevent Playwright’s stability check, and uses `.first()` for transient duplicate scene layers in room readiness and furniture reload assertions. These are test-harness changes only.
- `code/tests/scene-poses.browser.mjs` and `code/tests/scene-reach.browser.mjs` now honor `DANGO_ARTIFACTS` and create the destination directory. `scene-load.browser.mjs` and game logic were not changed.
- The requested follow-up commands were blocked by the environment’s command approval gate, so no new pass/fail claim is made for this follow-up. Existing unit evidence remains 16/16 in `provenance/node_test_r2_unit.txt`; old extended-run failures remain in `round1/evidence-r2x/2026-11-06T18-03-32-056Z-109646/`.
