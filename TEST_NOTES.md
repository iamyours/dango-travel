# Test notes — R2 acceptance

Baseline: `e2808c9cb292380f4afb3daed1fdce2ab03b550b`. Dates and wall-clock times use `America/Los_Angeles` (PST on November 6, 2026).

## Verified after the fixes

Run the Node and standalone browser tests from `code/`. For the browser tests, the recorded run used the corrected Chrome path and `DANGO_ARTIFACTS=/workspace/dango-ux-release-2026-11-06/provenance/browser-artifacts`.

| Check | Result | Evidence |
|---|---|---|
| `node --test tests/game-logic.test.mjs tests/scene-cover.test.mjs tests/migrate-fixtures.test.mjs` | **16/16 pass** | [Final Node log](../provenance/node_test_r2_unit_final.txt) |
| `node tests/scene-load.browser.mjs` | EXIT 0 | [Browser artifacts](../provenance/browser-artifacts/) |
| `node tests/scene-poses.browser.mjs` | EXIT 0; races ok | [Browser artifacts](../provenance/browser-artifacts/) |
| `node tests/scene-reach.browser.mjs` | EXIT 0 | [Browser artifacts](../provenance/browser-artifacts/) |
| `r2-extended.mjs` (see [driver setup](../round1/driver/RUN.md)) | **All phases passed** in the 10:14:25–10:14:56 PST rerun, including `D-garden-indoors`, `A-shop-pack`, `C-pond-ready-exit`, `B-feed`, `B-furniture-reload`, and all `E-*` samples (360/390/430/1280, zh/en) | [Run summary](../round1/evidence-r2x/2026-11-06T18-14-25-908Z-116508/summary.json), [evidence archive](../provenance/r2x_evidence_final.tar.gz) |

The Shop regression covers the `data-shop-sec` category chips, compact grid, priced purchase buttons, disabled states for unmet requirements, and clearance above the bottom tabs. The extended run uses natural UI actions, including resource collection and furniture purchase and placement, and checks that furniture persists on reload. The v2/v3 migration and used first-trip tests instead load synthetic saves through the production loader; they are not natural UI evidence.

## Evidence limits and known non-blockers

- The real five-minute first trip, return, gifts, and collection still rely on [evidence-r1](../round1/evidence-r1/) and [evidence-r2](../round1/evidence-r2/). The Shop, pond, and furniture work did not change first-trip duration, so the full wait was not repeated. The extended run does not replace it.
- [R2_ANALYSIS.md](../provenance/R2_ANALYSIS.md) lists the nine pre-change R2 PNGs the CLI actually inspected at pixel level: one 390×844 Chinese natural-play sample. It does not validate the redesigned Shop, other viewports or locales, different times or seasons, the 3D pond, or furniture editing. JSON and uninspected screenshots are not visual review evidence.
- Some E samples rely on the disabled purchase state to communicate a shortage at zero balance. Some poses clover probes report `ok:false`, but the test exited 0 and races passed; this is non-blocking probe noise. The box desktop Chrome loopback preview remains unused, and rejected art remains off by default.

See the [fix matrix](../provenance/R2_FIX_MATRIX.md) for per-item evidence and the [delivery notes](../provenance/DELIVERY_R2.md) for the CLI records, staged diff check, and release archive audit. The driver is retained separately and is not in `code-changes.zip`.
