<h1 align="center">Harvest Lane</h1>

<p align="center">
  <strong>Grow it. Harvest it. Sell it.</strong><br/>
  An original 2.5D farming and market tycoon, built with Phaser 3 and TypeScript.
</p>

<p align="center">
  <a href="https://yashdashrath18.github.io/harvest-lane/"><img src="https://img.shields.io/badge/Play%20Now-Live%20Demo-3d9b35?style=for-the-badge" alt="Play now"/></a>
  <img src="https://img.shields.io/badge/Phaser-3.86-2c2c54?style=for-the-badge" alt="Phaser 3"/>
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178c6?style=for-the-badge" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-6-646cff?style=for-the-badge" alt="Vite"/>
  <img src="https://img.shields.io/badge/Tests-29%20passing-2ea44f?style=for-the-badge" alt="Tests passing"/>
</p>

---

## About

Harvest Lane is a complete, self-contained farming and market tycoon that runs entirely in the browser. You manage a small farm built around one loop: grow crops, carry the harvest to your market stall, and serve the queue of customers before their patience runs out. Coins earned at the stall fund upgrades and a second field, while chickens and cows turn your farm into a small production economy of eggs and milk.

Every asset in the game is generated in code. The art, the characters, and even the music and sound effects are synthesized at runtime. There are no downloaded assets, no ads, and no in-app purchases.

**Play it live:** https://yashdashrath18.github.io/harvest-lane/

## The Core Loop

1. **Grow.** Corn ripens across three soil fields; carrots grow in the unlockable South Field.
2. **Harvest.** Walk the beds and pick ripe crops into your backpack. Capacity is a real constraint.
3. **Stock.** Carry produce to the market stall. Eggs and milk collected from the animal pens stock alongside crops.
4. **Serve.** Customers queue with visible orders and patience timers. A completed order pays the full ticket; a customer who waits too long leaves.
5. **Grow the farm.** Spend coins on upgrades, unlock new land, and claim mission rewards in coins and gems.

## Features

| Systems | Content |
| --- | --- |
| Farming | 200 crop plots across 4 fields, 2 crops (corn, carrots), 4 growth stages per crop |
| Animals | Chicken pen (eggs) and cow pen (milk) with wandering, animated animals and walk-over collection |
| Market | Customer queue with order bubbles, patience timers, atomic order pricing, coin-fly feedback |
| Progression | 4 upgrade tracks at 3 levels each (Backpack, Swift Boots, Fertilizer, Market Charm) and a purchasable field unlock |
| Missions | 6 tracked objectives paid out in coins and gems, claimed manually from the tasks panel |
| Audio | Fully synthesized WebAudio soundtrack (original chord loop) and sound effects, with independent music and effects volumes |
| Saves | Versioned autosave with reload recovery and corrupt-save protection; cloud save inside YouTube Playables |

## Controls

| Input | Action |
| --- | --- |
| Press and drag | Floating virtual joystick with analogue speed |
| Tap or click | Walk to that point; tap a ripe crop to harvest it |
| WASD or arrow keys | Move |
| E or Space | Harvest the highlighted crop |
| Buttons | SHOP for upgrades, TASKS for missions, gear for settings |

Designed portrait-first for phones (540 by 960), and fully playable with mouse and keyboard on desktop.

## Technology

| Layer | Choice |
| --- | --- |
| Engine | Phaser 3 |
| Language | TypeScript (strict type checking in the build) |
| Bundler | Vite (release bundle: one 1.55 MB JavaScript asset, about 358 KB compressed) |
| Audio | WebAudio synthesis, zero audio files |
| Art | Procedural canvas textures, zero image files |
| Persistence | localStorage (standalone), Playables cloud save (in environment) |
| Testing | Vitest unit tests plus scripted headless-browser QA |

## Project Structure

```text
index.html, assets/   The production build served by GitHub Pages
src/
  scenes/             Boot, Preload, MainMenu, Game, UI
  entities/           Player, Crop, Customer
  systems/            Crops, animals, market, customers, backpack,
                      upgrades, missions, saves, audio
  data/               Crop, item, upgrade and mission definitions
  platform/           YouTube Playables adapter (the only SDK boundary)
  ui/                 Style constants and the virtual joystick
docs/                 Game description, metadata, platform notes
PHASE_REPORTS.md      The complete phase-by-phase build and QA record
```

## Development

```bash
npm install
npm run dev            # dev server
npm test               # 29 unit tests (Vitest)
npm run build          # QA and preview build (dist/)
npm run build:release  # release build, QA hooks stripped
npm run preview        # serve the built bundle
```

## Quality Record

The game was built in ten verified phases, each closed with its own report in [PHASE_REPORTS.md](PHASE_REPORTS.md). Highlights:

- Full core-loop regression in the production build: movement, collision, harvest, deposit, exact-coin serving, purchases, field unlock, mission claims, pickups, panel pause and resume
- Viewport matrix verified: 360x640, 390x844, 540x960, tablet, desktop, landscape (pillarboxed), and mid-game resize
- Touch joystick, tap-to-move, and keyboard input verified on emulated devices
- Memory profiled under full load: no leak across the stress window
- Save system verified for exact restore, corrupt-payload recovery, and cloud restore behind a mock Playables SDK

## YouTube Playables

The official SDK integration is implemented against the current documentation: SDK loaded before game code, correct first-frame and game-ready lifecycle, cloud-only progress in the environment, platform audio state above in-game controls, and platform pause and resume. Behaviour inside the real Playables runtime and the official test suite is pending programme access. Nothing here claims the game is approved or published on YouTube.

## Originality

Harvest Lane is an original work. All art, music, sound, writing, and code in this repository were created for this project. Genre references were used only for general direction; no assets, branding, characters, or artwork from any other game are included.

## Author

**Yash Dashrath**, Pune, Maharashtra, India

- GitHub: https://github.com/yashdashrath18
- LinkedIn: https://www.linkedin.com/in/yash-dashrath

Copyright Yash Dashrath. All rights reserved.
