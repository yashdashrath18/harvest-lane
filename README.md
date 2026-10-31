<h1 align="center">Harvest Lane 3D</h1>

<p align="center">
  <strong>Grow it. Harvest it. Sell it.</strong><br/>
  An original 3D farming and market tycoon for the browser, built with Three.js and TypeScript, designed for YouTube Playables.
</p>

<p align="center">
  <a href="https://yashdashrath18.github.io/harvest-lane/3d/"><img src="https://img.shields.io/badge/Play%20Now-3D%20Edition-3d9b35?style=for-the-badge" alt="Play Harvest Lane 3D"/></a>
  <a href="https://github.com/yashdashrath18/harvest-lane/actions/workflows/tests.yml"><img src="https://github.com/yashdashrath18/harvest-lane/actions/workflows/tests.yml/badge.svg" alt="Tests"/></a>
  <img src="https://img.shields.io/badge/Three.js-0.170-000000?style=for-the-badge" alt="Three.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178c6?style=for-the-badge" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-6-646cff?style=for-the-badge" alt="Vite"/>
</p>

---

## Play

**[▶ Harvest Lane 3D](https://yashdashrath18.github.io/harvest-lane/3d/)** — the flagship edition, described below.

**[▶ Harvest Lane (2D)](https://yashdashrath18.github.io/harvest-lane/)** — the original 2.5D edition built with Phaser 3. It shares the same design and pure-logic core, and is kept live as the project's first shipped version.

## The game

You run a small farm built around one loop: grow crops, harvest them by walking over the beds, stock your market stall, and serve the customers queueing at it. Coins and gems earned at the stall fund upgrades, animals, machines, a hired helper and cosmetic skins, so the farm keeps getting faster, richer and more your own.

The farm has 4 fields and 200 crop plots (corn and carrots), a chicken pen and a cow pen, and a market stall, all fenced with gates you walk through, controlled with a virtual joystick (WASD and arrows work on desktop).

## Features

- **Walk-over harvesting**: step on a ripe crop to collect it. Backpack capacity is a real constraint, and every farm level adds a slot.
- **Animals with feeding**: pen troughs hold up to 20 corn; each egg or milk costs 1 feed, and an empty trough stops production and raises a warning marker.
- **Customers in waves**: buyers arrive in waves of 3 with calm breaks between them. Sale money lands on a physical cash pile beside the stall, collected by walking over it. Clearing a wave with no walk-aways pays a bonus.
- **Progression that never runs out**: XP and farm levels, 4 upgrade tracks, a South Field unlock, 6 base missions, then endless scaling contracts, plus 3 daily missions that refresh every morning.
- **A hireable AI helper** (300 coins) who routes through the field gates, harvests ripe crops and stocks the stall on his own.
- **Processing**: a cheese churn (400 coins) turns 1 milk (14 coins) into 1 cheese (42 coins), and customers start ordering cheese once it exists.
- **Economy touches**: capped offline earnings with a welcome-back panel, a sneakers boost pad (1.5x speed for 2 minutes), and a corn-for-gems trade (9 corn = 1 gem) so gems never require watching an ad.
- **Skins store**: 16 cosmetics in the shop — 6 farmer outfits, 5 weather and lighting themes (Bright Day, Mint Morning, Golden Hour, Dusk Violet, Winter Frost) and 5 road styles, bought with coins or gems.
- **No forced ads, ever.** Rewarded offers are opt-in only, pay only on platform-confirmed completion inside YouTube Playables, and grant nothing in the web version.
- **Safe saves**: one versioned save format shared by the web (localStorage) and the Playables cloud save, validated on load so a corrupt or outdated save cannot brick the game.

## Tech

| | |
|---|---|
| Engine | Three.js (3D), Phaser 3 (2D) |
| Language | TypeScript |
| Build | Vite |
| Tests | Vitest, 45 unit tests on the 3D edition, run in CI on every push |
| Sound | WebAudio: synthesized music, CC0 Kenney SFX samples with synthesized fallbacks |
| Art | Generated in code (procedural textures, primitive-built models), plus a few evaluated CC0 assets (Quaternius cow and carrots) |

The pure-logic systems (economy, missions, progression, cosmetics, save validation) are separated from rendering, which is what let one core power both editions and be unit tested directly. The playable 3D build is about 1.9 MB, far under the Playables 30 MB guidance.

## Repository layout

- `3d/` — the playable 3D build (what GitHub Pages serves)
- `harvest-lane-3d/` — the full 3D source, tests, docs and phase reports
- Root — the playable 2D build, with its source in `src/`
- `harvest-lane-3d/PROJECT_SUMMARY.md` — a one-document summary of the whole project

## YouTube Playables status

Playables is early-access only. The game is packaged and ready (release zip, thumbnail, icon); the interest form application is drafted and next, then Google's official test suite once programme access is granted.

## Originality

Harvest Lane is an original game: its world, characters, art and code were created for this project. Genre conventions (grow, harvest, sell, upgrade) are shared with every farming game; no other game's assets, art or code are used.

## Author

**Yash Dashrath** — first-year B.Tech Computer Science student at NMIET, Talegaon, Pune, India. Video editor, photographer, and founder of Yash MediaWorks.

- GitHub: https://github.com/yashdashrath18
- LinkedIn: https://www.linkedin.com/in/yash-dashrath
