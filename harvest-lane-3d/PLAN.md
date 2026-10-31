# Harvest Lane 3D: build plan

The 3D edition of Harvest Lane: same game design, economy, missions
and farm layout as the 2D game, rebuilt in Three.js with low-poly
models made in code. The 2D game stays live and untouched.

## Design changes set by Yash on 2026-10-30
1. **Walk-over harvesting.** Walking into a crop section auto
   collects every ready crop the farmer touches (no harvest
   button needed for the basic loop), backpack capacity still
   applies. This replaces the 2D proximity-plus-button rule.
2. **Rewarded-ad earn offers.** Tapping the coin or gem pill opens
   an earn offer (for example +50 coins or +3 gems) with a play
   button that calls the Playables rewarded-ad API. A reward is
   granted only when the platform reports the ad completed. In
   standalone mode (GitHub Pages) no ad network exists, so the
   offer explains that rewards are available in the YouTube
   version and grants nothing. No fake ads, no fake rewards.
   Consequence: if the 3D edition is ever the submission, its
   store text must declare rewarded ads, unlike the 2D edition.
3. **Richer presentation as a standing direction.** Procedural
   detailed textures (grass blades, wood grain, sand, soil) instead
   of flat colour, fuller character animation (walk cycle, idle,
   harvest motion), and layered synthesized sound. Everything is
   still generated in code; "realistic" here means textured and
   shaded, not photographic assets.

## Phases
1. Scaffold, ported logic (data, market, backpack, missions,
   upgrades, saves, audio: 22 unit tests green), 3D world, farmer,
   movement (joystick, keys, tap), camera, DOM HUD shell.
2. Crops in 3D with growth stages; walk-over auto-harvest;
   backpack wiring; harvest feedback.
3. Stall and customers in 3D; deposit and serving loop; coins.
4. Animals: chickens, cows, pens, eggs and milk.
5. Panels: upgrades shop, missions, settings with audio sliders,
   South Field unlock, rewarded-ad earn offers.
6. Saves (local and Playables cloud) and the SDK lifecycle.
7. QA: logic tests, browser regression, viewport matrix,
   performance pass.
8. Package and publish alongside the 2D game.

Reports land in PHASE_REPORTS.md as each phase closes.
