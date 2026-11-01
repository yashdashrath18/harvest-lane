<div align="center">

# 🌽 Harvest Lane 3D

**The 3D edition of Harvest Lane: the same farming and market tycoon, rebuilt in Three.js with a low-poly farm, walk-over harvesting, and customers at the stall.**

[▶ Play Harvest Lane 3D](https://yashdashrath18.github.io/harvest-lane/3d/) · [🌽 Play the 2D edition](https://yashdashrath18.github.io/harvest-lane/)

</div>

## What it is

An original farming game built in code, with a small set of CC0 assets added in the 2026-10-31 asset pass: Kenney sound effects, a Quaternius cow and Quaternius carrot models (full record in `docs/ASSETS.md`). Everything else (world, farmer, chickens, corn, music) is generated in code, and every borrowed asset has a code-generated fallback. Walk the fields to harvest, feed the stall, serve customers, raise chickens and cows, finish missions, buy upgrades and unlock the South Field.

A competition update on 2026-10-31 (built from a study of My Perfect Farm, Farm Land and My Mini Mart, and their player reviews) added the genre's proven systems, minus its most-hated one: **no forced ads, ever** (rewarded ads stay opt-in). New: farm levels and XP, a physical cash pile at the stall, animal feeding through troughs, daily missions, endless contracts after the base missions, a hireable AI helper, a cheese churn (milk 14 → cheese 42), customer waves with calm breaks, capped offline earnings with a welcome-back panel, a sneakers speed-boost pad, a corn-for-gems trade, a visible Saved indicator, and particle bursts on harvest, sale and level-up.

The **Master Programme** update on 2026-11-01 rebuilt the game's long-term arc (plan in `docs/MASTER_PLAN.md`, economics in `docs/ECONOMY.md`): a 50-level progression system with an unlock roadmap (backpack space grows with level, LEVEL UP panels, per-action XP pricing); a **seed and replant loop** (harvest leaves bare soil, walk over it with seeds to replant, seed packs and a seed bag, an anti-softlock trickle so the farm can never dead-end); **land extensions** (six East Strip packs and the East Field, 108 extra corn plots east of a barricaded gate); **animal extensions** (hens 3 → 12, cows 2 → 8, troughs that grow per tier); a **harder economy** verified by an included simulator (`npm run sim` drives the real data files and checks the progression targets); a full **outfit system** (five categories, 26 pieces, hats/chains/glasses as real attachments, a live preview farmer in the shop); and the **Grand Hotel**, a locked landmark that unlocks at Level 10 with its future room system defined as data. A Reduce Motion setting caps the celebration effects, and particles are hard-capped for performance.

## How this edition differs

- **Walk-over harvesting:** stepping on a ripe crop collects it (the 2D edition uses a harvest button near a highlighted crop)
- **3D world:** the same farm layout as low-poly models with procedural textures (grass blades, wood grain, ploughed soil)
- **Rewarded offers:** tapping the coin or gem pill offers a bonus for watching an ad, paid only on platform-confirmed completion, and only inside YouTube Playables; the web version explains and grants nothing
- **Landscape-friendly:** the wider camera view suits landscape screens, alongside the portrait phone layout

## Tech

Three.js · TypeScript · Vite · Vitest (67 logic tests) · WebAudio-synthesized music, sampled CC0 SFX with synth fallback · YouTube Playables SDK adapter with cloud saves in the Playables environment and local saves on the web.

## Status

Feature-complete and live at the link above. The YouTube Playables submission still runs through the 2D edition's paperwork; see `docs/SUBMISSION_NOTES.md` for what must change if this edition is submitted instead (its description must declare the rewarded ads).

Build phases and verification records: `PHASE_REPORTS.md`.
