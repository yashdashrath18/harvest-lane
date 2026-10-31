# Harvest Lane: Project Summary

*Written so it can be pasted into any AI assistant (or shown to any reviewer) for a serious, informed review of the project.*

## Who I am

I am Yash Dashrath, a first-year B.Tech Computer Science student at NMIET, Talegaon, Pune, India. Alongside college I work as a freelance video editor and photographer, and I run a small creative studio, Yash MediaWorks. Harvest Lane is my first real game project, built to learn game development properly and to submit to YouTube Playables.

## What the game is

Harvest Lane is a farming and market tycoon game for the browser, designed for YouTube Playables (short 5 to 10 minute sessions, portrait phone layout, landscape friendly). The core loop: grow crops, harvest by walking over them, stock a market stall, serve customers, earn coins and gems, then reinvest in upgrades, animals, machines and cosmetics that make the farm faster and richer.

It exists in two editions that share one design and one pure-logic core:

- **Harvest Lane (2D)**: Phaser 3. Play: https://yashdashrath18.github.io/harvest-lane/
- **Harvest Lane 3D**: Three.js, the flagship edition. Play: https://yashdashrath18.github.io/harvest-lane/3d/
- **Code**: https://github.com/yashdashrath18/harvest-lane

## What is in the 3D edition

- **The farm**: 4 fields, 200 crop plots (corn and carrots), a chicken pen and a cow pen, a market stall, fenced plots entered through gates, a virtual joystick (WASD and arrows on desktop).
- **Animals with feeding**: pens have troughs holding up to 20 corn. Each egg or milk costs 1 feed; an empty trough stops production and raises a warning marker.
- **Customers in waves**: buyers queue at the stall in waves of 3 with calm breaks between waves (a deliberate fix for the genre's stressful endless queues). Sale money lands on a physical cash pile beside the stall; you collect it by walking over it.
- **Progression**: XP and farm levels (each level pays gems and +1 backpack capacity), 4 upgrade tracks (backpack, boots, growth, prices), a South Field unlock, 6 base missions, then **endless contracts** that scale forever so the game never runs out of goals, plus 3 daily missions that refresh every morning.
- **Help and processing**: a hireable AI helper (300 coins) who routes through the field gates, harvests, and stocks the stall on his own; a cheese churn (400 coins) that turns milk worth 14 into cheese worth 42, which customers then order.
- **Economy touches**: capped offline earnings with a welcome-back panel, a sneakers boost pad (1.5x speed for 2 minutes), a corn-for-gems trade (9 corn = 1 gem) so gems never require watching ads, particle bursts and floating text as game feel.
- **Skins store**: 16 cosmetics in three groups: 6 farmer outfits, 5 weather and lighting themes (Bright Day, Mint Morning, Golden Hour, Dusk Violet, Winter Frost), 5 road styles, bought with coins or gems and saved permanently.
- **Monetisation stance**: no forced ads, ever (the number one player complaint in this genre, from my own competitor research). Rewarded ads are opt-in only, pay only on platform-confirmed completion inside YouTube Playables, and grant nothing in the web version.
- **Saves**: one versioned save format shared by localStorage (web) and the Playables cloud save through the SDK adapter, with validation and safe fallbacks so a corrupt or outdated save cannot brick the game.

## Tech and engineering

- **Stack**: TypeScript, Three.js (3D edition), Phaser 3 (2D edition), Vite, Vitest. WebAudio sound: synthesized music plus CC0 Kenney sound samples with synthesized fallbacks.
- **Art**: almost everything is generated in code (procedural canvas textures, primitive-built low-poly models). A small number of CC0 assets were evaluated and adopted where they genuinely looked better: Kenney SFX, an animated Quaternius cow, Quaternius carrot models. Other assets were tested and rejected on in-game evidence (style clashes, missing animations, file size).
- **Architecture**: pure-logic systems (economy, missions, progression, save validation) are separated from rendering, which is what allowed the same core to power both editions and to be unit tested. 45 unit tests currently pass. The game bundle is about 1.9 MB, well under the Playables 30 MB guidance.
- **Process**: built in numbered phases, each with a written completion report and verification evidence (unit tests, headless-browser gameplay regressions, live deployment checks). It was also shaped by a structured competitor study of My Perfect Farm, Farm Land, My Mini Mart and Hay Day reviews, which produced a prioritised improvement list; most of it is shipped, the rest is documented as a roadmap (decorations beyond skins, a prestige mode, timed instant orders, wheat and a flour mill, goats, Playables score submission).

## Current status

Both editions are live and playable at the links above. The YouTube Playables programme is early-access only, so the remaining step is the interest form application (drafted, not yet submitted) and then Google's official test suite once access is granted.

## What I want feedback on

1. Game design: is the loop satisfying in the first 2 minutes? Where would a new player get bored or confused?
2. Progression and economy: do upgrades, missions and contracts arrive at the right pace, and are prices fair?
3. Retention: what is missing that would make someone return tomorrow?
4. Code and architecture (from the repo): what would you refactor, and what is over- or under-engineered for a student project?
5. Playables fit: does it match what the platform rewards (session length, instant fun, save safety)?

Please be critical rather than encouraging. Specific, actionable points are worth more to me than general praise.
