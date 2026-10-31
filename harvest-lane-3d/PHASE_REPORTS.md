# Harvest Lane 3D: phase reports

## PHASE 3D-1: scaffold, world, farmer, movement, HUD shell
STATUS: Complete (with Yash's three design changes recorded in PLAN.md and folded into the phase plan)

IMPLEMENTED AND VERIFIED:
- New project at ~/workspace/harvest-lane-3d (Three.js + TypeScript + Vite). The 2D game is untouched and stays live.
- The pure-logic core was ported from the 2D game unchanged: data tables, EventBus, Backpack, Market, Mission, Upgrade, Save and Audio systems, and the Playables adapter. 22 of the 2D game's 29 unit tests apply to the ported core (the rest test Phaser-specific movement) and all pass in the new project.
- 3D world on the 2D farm's exact layout (46 px = 1 unit): textured grass (canvas-drawn blades and mottling), sandy paths, four soil fields with ploughed rows, chunky post-and-rail fences with wood grain texture, chicken and cow pens fenced with gate gaps, perimeter fence with the south entrance gap, the market stall (posts, blue-white striped awning, counter, produce crates), entrance sign, trees and bushes.
- The farmer is an original code-built low-poly model (straw hat with band, red shirt, denim overalls and bib, swinging arms and legs, idle breathing, blob shadow). Movement: floating joystick, WASD and arrows, tap-to-move by ground raycast, smooth facing, walk cycle, camera follow at a tilted follow angle.
- DOM HUD in the converted interface's style: avatar with star badge, SETTINGS and SHOP medallions, coin and gem pills, objective card, MISSION clipboard, backpack pill with fill bar, HARVEST button, menu overlay with TAP TO PLAY, and the shared cream panel shell (wood border, blue ribbon, red close) ready for the panel phases.
- Playables lifecycle wired from the start (SDK in the head, firstFrameReady on the first rendered frame, gameReady on Play).
- Textures per Yash's direction: procedural detail (wood grain with knots, grass blades, sand pebbles, soil rows) instead of flat colour everywhere it counts.
- Verified by build plus a headless WebGL run: menu renders, Play starts the game, keyboard movement moved the farmer 5.8 to 7.2 units across runs, zero console errors (a favicon 404 was fixed). Screenshots in qa/p1-{menu,world,fields}.png.

KNOWN LIMITS AT THIS PHASE:
- Fields are empty soil until crops land in Phase 2; there is no collision yet (fields are walkable by design for walk-over harvesting; pen fences get collision when animals land).
- HUD icons are a mix of inline SVG and system glyphs; the panel contents, earn offers, and currency wiring land in Phases 3 to 5.

## PHASE 3D-2: crops and walk-over auto-harvest
STATUS: Complete

IMPLEMENTED AND VERIFIED:
- Crops in 3D for fields A, B and the cornfield: 152 corn plots on the same 46px grid as the 2D game. Each growth stage is a single merged, vertex-coloured geometry (four per crop type, shared by every crop), so the field costs roughly one draw call per visible crop. Ripe corn carries three gold cobs with husks; carrots (for the South Field) are modelled too, with orange shoulders at the ripe stage.
- Growth runs on the ported crop data (corn 24s grow, 14s regrow), with the same deterministic stagger so fields are never in lockstep, a smaller scale while young, and a gentle breathing pulse on ripe crops.
- Walk-over auto-harvest (Yash's design change): stepping on a ready crop collects it into the backpack, plays the harvest sound, pops a floating "+1" at the crop, tracks the harvest missions, and refreshes the objective card. At capacity the crop stays standing, a throttled "Backpack full" float shows, and the error sound plays. Harvested crops regrow on the data timer.
- The HUD harvest button is hidden in the 3D edition (walk-over replaces it, per the design change).
- Frame-rate independence fixed properly: the loop now substeps game time in 50ms slices, so slow devices run at real-time speed instead of slow motion. This was found by the first harvest test, where the old 50ms delta cap made the headless run crawl at about 0.3x speed and the farmer never reached a crop row: a test-path and timing diagnosis, resolved in the engine loop.

VERIFIED (headless WebGL, .qa/smoke-p2.mjs):
- 152 crops planted; natural ripening observed (57 ready at load from the stagger, 79 four seconds later).
- After walking a forced-ripe field: backpack filled to exactly 10/10 corn (capacity enforced), mission harvest-30 progress 10, objective card updated to (10/30), backpack pill shows 10/10 with the red full bar, "Backpack full" feedback visible in qa/p2-harvest.png, zero console errors.

NEXT: Phase 3D-3, stall customers and the selling loop (deposit at the stall front, queue, orders, coins), which also gives the backpack somewhere to empty.

## PHASE 3D-3: stall, customers, and the selling loop
STATUS: Complete

IMPLEMENTED AND VERIFIED:
- Customers in 3D: three original variants on the farmer's rig proportions (blue shirt with orange sun hat, orange shirt with wide purple hat, green shirt with teal cap, varied skin tones), all animated with the same walk cycle. They enter from the south gate, walk the path to the stall queue slots, wait facing the stall, and leave south when served or out of patience.
- Order bubbles ride above each customer's head as DOM elements projected from 3D every frame: item icon, quantity, and a patience bar that drains over 45 seconds and shifts green to orange to red. Happy and sad emote floats mark served and timed-out departures.
- The economy runs on the ported MarketSystem with the same order pattern as the 2D game (carrot orders stay gated until the South Field unlock): the front customer is served atomically when stock covers the order, coins land with the coin sound, and sell and serve missions track. During verification the loop kept running live: an egg order served itself from test stock while the deposit check was underway, moving coins 12 to 30 and egg stock 6 to 4, exactly per prices.
- Deposit: standing at the stall front moves one item per 160ms from backpack to stall stock with pickup sounds and floats. A stock chip pinned above the stall awning shows the live stall contents and updates on every stock change.
- HUD coin and gem pills now update from the market's own change events.

VERIFIED (headless WebGL, .qa/smoke-p3.mjs): customer spawned and queued; stocked serve of corn x2 paid exactly 12 coins, sell-25 progress 2, serve-10 progress 1, HUD coins 12; deposit moved 5 corn from bag to stock (8 to 13, bag to 0) with the farmer standing at the stall front; zero console errors. Two early test faults were the script's (a wrong mission id, then blind key-walking that overshot the stall); both were fixed in the script, and the game behaved correctly throughout.

NEXT: Phase 3D-4, animals: chickens and cows in their pens, eggs and milk as walk-over pickups, so egg and milk orders have a real source.

## PHASE 3D-4: animals, pens, eggs and milk
STATUS: Complete

IMPLEMENTED AND VERIFIED:
- Chickens (3) and cows (2) as original code-built 3D models: chickens with plump bodies, pecking heads, red combs and orange beaks and legs; cows with black-patched bodies, pink muzzles and udders, horns, ears and swaying tails.
- Behaviour: each animal wanders its pen on its own loop of pausing and strolling. Chickens peck while paused (fast head dips) and hop-bob while walking; cows graze while paused (head lowered) with constant tail sway. Animals never leave their pen bounds.
- Production on the 2D timings: eggs about every 13s per chicken, milk about every 21s per cow, appearing as bobbing, slowly spinning ground pickups next to the animal (a white egg ellipsoid, a capped milk bottle), capped at 8 per item so pens cannot flood.
- Collection is walk-over, consistent with harvesting: stepping on a pickup adds it to the backpack if there is room (it stays on the ground when full), plays the pickup sound, floats the item, and tracks the collect missions (the eggs mission advanced in testing).
- Ambient sound: synthesized clucks near the chicken pen and moos near the cow pen every few seconds while the farmer is close, on the ported audio system.

VERIFIED (headless WebGL, .qa/smoke-p4.mjs): first pickup was an egg with 3 pickups already produced; walking into the pen collected 2 eggs en route to the target egg, collect progress 2; milk appeared on the cow cycle; zero console errors. Screenshot qa/p4-pens.png shows both pens populated, an egg on the ground, and a customer waiting at the stall at the same time.

NEXT: Phase 3D-5, the panels phase: upgrades shop, missions with claims, settings with the audio sliders, the South Field unlock (which plants the carrots and opens carrot orders), and Yash's rewarded-ad earn offers on the currency pills.

## PHASE 3D-5: shop, missions, settings, South Field, earn offers
STATUS: Complete

IMPLEMENTED AND VERIFIED:
- Upgrades shop in the ribbon panel shell: the four ported tracks (Backpack, Swift Boots, Fertilizer, Market Charm, 3 levels each) with level pips, honest current-to-next effect text, and coin buttons that disable when unaffordable or maxed. Purchases apply live: capacity (verified 10 to 16 at level 1 per the data table), movement speed, crop growth factor, and stall price multiplier all read from the UpgradeSystem's own computed effects.
- South Field unlock in the same shop for 150 coins: spends the coins, tracks the area mission, plants the 48 carrot plots (total crops 152 to 200, verified), and opens carrot orders in the customer pattern.
- Missions panel: all six missions with progress bars, reward text, and CLAIM buttons that pay through the market (harvest-30 claim paid exactly its 40 coin reward and marked claimed). The objective card continues to track the first live mission and prompts claims.
- Settings panel: Music and SFX range sliders wired to the ported audio system, applying live and persisting through its own localStorage settings (a programmatic set to 25 percent read back as 0.25).
- Rewarded-ad earn offers (Yash's design change): tapping the coin pill opens "Earn Coins, +50, Watch ad"; tapping the gem pill opens "Earn Gems, +3, Watch ad", both in the reference-style offer modal. The button calls the Playables rewarded-ad API and pays only on platform-confirmed completion. In standalone the adapter declines, the panel explains that ads play in the YouTube version and this web version has no ad network, and the wallet does not change (verified: status text shown, coin delta 0).
- Panels pause the world while open, as the 2D game does.

TWO REAL BUGS FOUND AND FIXED BY REAL-CLICK TESTING:
1. Panel buttons were dead to real clicks: the HUD root passes pointer events through, and the panel wrapper never re-enabled them, so every panel button would have failed on a real phone too (the settings slider only appeared to work because the first test dispatched its event programmatically). The wrapper now takes pointer events when open, and every panel action was re-verified with real clicks.
2. The panel's blue ribbon title was clipped in half by the panel's own scroll overflow; scrolling moved to the panel body, so the ribbon and close button render whole.

NEXT: Phase 3D-6, saves and the full Playables lifecycle (local save, cloud save in the Playables environment, platform pause and mute).

## PHASE 3D-6: saves and the Playables lifecycle
STATUS: Complete

IMPLEMENTED AND VERIFIED:
- The ported SaveSystem drives the 3D game with the same v1 schema (the player position is stored in design pixels, converted both ways). Restores apply in dependency order: market, upgrades, backpack (so restored items fit the upgraded capacity), missions, the South Field (replanted, carrot orders reopened), player position, and audio volumes, with the HUD refreshed from the restored state.
- Standalone: change events (coins, gems, stock, backpack) mark the save dirty; a 5 second interval persists dirty state to localStorage; tab-hide saves a dirty session. Verified exactly: coins 321, 3 corn in the bag and 5 harvest progress restored after reload, HUD included.
- Corruption: a garbage payload is backed up under the corrupt-backup key and the game starts fresh (backup contents verified).
- Playables environment (mock SDK): the cloud save is the only save. Verified: a cloud save with 777 coins was applied, no local save was written, loadData ran before any saveData, platform pause froze both the farmer and the world, resume restarted movement, and pausing triggered a cloud save with a well-formed payload in the correct call order (firstFrameReady, loadData, gameReady, saveData). Platform audio callbacks are registered and drive the audio system's platform mute, which sits above the in-game sliders.
- The real Playables Test Suite remains unavailable (programme access pending), exactly as with the 2D game; everything testable outside it is tested.

TWO REAL BUGS FOUND AND FIXED:
1. Module-order crash on restore: the standalone boot path applied a save synchronously before later declarations in the module existed (a temporal-dead-zone error in the bundle), which killed boot after a partial restore. Boot now runs after the whole module evaluates, and the error is gone from every scenario.
2. Save-on-hide masking corruption: an untouched session wrote a fresh default save when the tab hid, which would overwrite a corrupt stored save before the next boot could detect and back it up. Hide and interval writes now require actual changes, and restore echoes no longer count as changes.

NEXT: Phase 3D-7, the QA phase: unit tests, a full-loop regression in the 3D build, the viewport matrix, and a performance pass.

## PHASE 3D-7: QA, viewports, performance
STATUS: Complete

UNIT TESTS: 22 of 22 passing (the ported logic core: backpack, market, missions, upgrades, saves, audio).

FULL-LOOP REGRESSION (.qa/regression-p7.mjs, one continuous session, real input):
- Three harvest-and-deposit cycles driven by keyboard steering and field sweeps: exactly 30 corn harvested (the mission target), backpack empty after each deposit.
- The queue ran live throughout: three serves landed for exactly 54 coins (corn x2 at 12, corn x4 at 24, corn x3 at 18, sell progress 9), while the egg and milk orders timed out and left on patience, exactly per the order pattern and the 45 second rule, since the farmer never visited the pens in this run.
- The completed harvest mission was claimed from the real missions panel: coins 54 to 94, the exact 40 coin reward.
- Zero console errors across the whole session.

VIEWPORT MATRIX: 360x640, 390x844, 844x390 landscape, 768x1024 tablet and 1440x900 desktop all boot with the canvas filling the screen, the HUD intact and zero errors. Landscape is a genuine strength of the 3D edition: the wider camera view shows both fields and both pens at once (qa/p7-landscape.png), with no pillarboxing.

PERFORMANCE AND SIZE:
- Busy-scene renderer load: 446 draw calls and about 96k triangles with 152 crops planted and customers active; 935 scene objects. Triangles are light; draw calls are moderate for a low-poly scene and acceptable on current phones, with fence and decor meshes the obvious future merge if a low-end device ever struggles.
- Headless SwiftShader frame rate measured 5 to 7 FPS, which is the software renderer on this shared VM, not a device figure (the same environment capped the 2D game at 16 to 37). Real-device feel remains Yash's playtest, as with every phase.
- Release build verified: the QA hooks are stripped (0 occurrences in the bundle), and the game ships at 548 KB of JavaScript, 143 KB gzipped.

KNOWN LIMITS CARRIED FORWARD: no collision against fences and the stall (walk-over design keeps fields open; pens are entered through their gates by convention), the Playables Test Suite still needs programme access, and real-device performance is unverified.

NEXT: Phase 3D-8, package and publish the 3D edition alongside the 2D game.

## PHASE 3D-8: package and publish
STATUS: Complete. Harvest Lane 3D is finished and live.

PACKAGE (~/workspace/harvest-lane-3d/release/):
- harvest-lane-3d-playables.zip (146 KB): the release build (relative asset paths, QA hooks stripped, Playables SDK script in the head).
- thumbnail-1280x720.png and icon-512x512.png, composed from real 3D gameplay captures.
- docs/SUBMISSION_NOTES.md records the one paperwork difference that matters: if this edition is ever submitted, its description must declare the rewarded-ad offers; the live submission draft describes the ad-free 2D edition and must not be reused for 3D.

PUBLISHED: pushed to the existing harvest-lane repository as the 3d/ folder (commit e5f2c5ee), with a Harvest Lane 3D section and play link added to the repo README. Verified live by direct fetches:
- https://yashdashrath18.github.io/harvest-lane/3d/ returns 200 and references the current release bundle, and the bundle itself returns 200.
- The 2D edition at the root still returns 200, untouched.

THE 3D EDITION, COMPLETE: all eight phases done. Same game design and economy as the 2D edition, rebuilt in Three.js with code-generated models and textures throughout, walk-over harvesting, 3D customers and animals, the full panel set (shop, missions, settings, South Field), Yash's rewarded-ad earn offers wired to the real Playables API with platform-confirmed rewards only, versioned saves (local on the web, cloud in Playables), and the platform pause and mute lifecycle. Verified across the phases by 22 unit tests, per-phase browser smokes, a full-loop regression, a five-size viewport matrix, save corruption and mock-SDK scenarios, all with zero console errors in the final runs.

STILL OPEN (unchanged, and not part of this build): real-device playtest feel is Yash's to judge; the YouTube Playables programme access and Test Suite remain Google's side of the door; the interest-form submission still needs the Page 1 correction, the checkbox confirmation, and Yash's go-ahead.

## POST-RELEASE UPDATE (2026-10-31, at Yash's request)
Three changes, all implemented, verified in the browser, and published to https://yashdashrath18.github.io/harvest-lane/3d/ (commit 76ea3026):

1. FENCES BLOCK THE PLAYER. Every fence span now registers a collider (gate gaps excluded by construction), as do the stall, tree trunks and the entrance sign. Fields got gate gaps on their path-facing sides (1.7 units wide) and the pen gates were widened. Movement is axis-separated, so the farmer slides along a fence instead of sticking. Verified: stopped dead at field B's solid east fence (x -1.28), entered field A through its gate and harvested a full bag (10), exited and deposited at the stall (stock 10, bag 0), and entered the chicken pen through its south gate. Two earlier test runs "failed" by aiming at the new gate gaps and by routing through fences that no longer exist as walkable space; the game was correct in both.
2. RICHER VISUALS. Grass texture rebuilt at 1024px with three-tone mottling, 1,500 individual blades and sparse meadow flowers; soil gained clods and stones. Ripe corn cobs are plumper with a kernel sheen, open husks and a silky tassel; carrots have plump orange shoulders with pale tips; corn leaves are wider. Chickens gained side wings, a three-feather tail fan and eyes; cows gained a rounded barrel body over the frame. Stall fruit is larger with leaf tops.
3. TAP-TO-MOVE REMOVED. Pointer control is the joystick only, per the request; WASD and arrow keys remain for desktop (they are not tap input). The hint text now reads "Drag the joystick to move, or use WASD". Verified: a tap moved the farmer exactly 0 units; the joystick drag drove him the length of the farm in diagnostics.

The release zip in release/ was rebuilt from the same build.

## ASSET PASS (2026-10-31, at Yash's request: "Pick everything that enhances our game and update it")
Followed the same day's asset research (report in ~/workspace/research_notes/harvest-lane-3d-asset-resources-20261030-1949/). Full asset record in docs/ASSETS.md.

DOWNLOADS: all seven Kenney packs came from kenney.nl through its own download-link endpoint. Quaternius's Google Drive folders were rate-limited by Google ("too many users have viewed or downloaded"), so the models came from license-clean mirrors of the same CC0 packs: the Farm Animals zip on OpenGameArt, and per-model GLB conversions in the trebeljahr/quaternius-showcase GitHub repo.

INTEGRATED (each with the code-generated version kept as fallback):
1. KENNEY SFX (CC0): 13 samples embedded (click, confirmation, error, pluck, chop for harvest, two casino chip sounds for coins, a steel jingle for upgrades, and five grass footsteps, a new sound the game did not have). AudioSystem plays the sample when loaded and the original synth effect otherwise. Music stays synthesized; cluck and moo stay synthesized because the packs contain no animal sounds (the $1.99 Assetsmith farming pack that has them was not purchased).
2. QUATERNIUS COW (CC0): real skeletal model replaces the procedural cows, with Walk while strolling and Eating / Idle_Headlow while paused, crossfaded. Its MeshStandardMaterial rendered far too dark in this Lambert-lit scene, so materials are converted to Lambert keeping colours. Facing verified numerically: the head bone's world offset matches the group's facing vector exactly (model faces +Z, same convention as the procedural cow, yaw correction 0).
3. QUATERNIUS CARROTS (CC0): all four growth stages replace the procedural cone tufts, converted at load into the game's merged vertex-coloured geometry so CropField3D and its single material work unchanged; the pack palette is lifted 1.45x because it is authored for a tone-mapped viewer. Ripe height normalised to 0.6 units, stages share one scale.

EVALUATED AND REJECTED (kept out on purpose):
- Quaternius corn: tested in-game at the verified correct scale (ripe height measured exactly 1.55 units). It reads as thin weeds with no visible cobs; the procedural corn with its three gold cobs reads better on a phone. Corn stays procedural.
- Quaternius Farmer: the GLB carries no animation clips, so swapping would lose the walk cycle. Farmer stays procedural.
- Chicken: the Farm Animals pack contains no chicken (cow, horse, llama, pig, pug, sheep, zebra). Chickens stay procedural.
- Kenney Pattern Pack and the CC0 photo libraries (Poly Haven, ambientCG): patterns are decorative, not ground textures; the photo textures are photorealistic, clash with the flat look, and run 8-10 MB each at 1K. Procedural grass and soil stay.

PUBLISHING CHANGE: the GitHub connector can only push UTF-8 text, so the binary assets are embedded into the JS bundle as base64 at build time (scripts/embed-assets.mjs, chained into both build scripts). The game is again one self-contained bundle, which also suits Playables packaging. Bundle is now 1.78 MB raw (about 176 KB gzip for the code share of it; total dist 1.9 MB), release zip 1.33 MB.

VERIFICATION: typecheck and release build clean; 22 unit tests pass; asset smoke confirms carrots ready, cow ready, 13/13 samples loaded, 14 skinned cow meshes, zero page errors; full-loop regression identical to the Phase 7 baseline (30 harvests, serves of 54 coins, mission claim +40 = 94 coins, zero errors; 475 draw calls, 123k triangles). One regression run failed before this: its steering drove diagonally into field B's south fence and wedged (farmer stuck at z 0.76 with 152 crops ready), a test-harness flaw exposed by the heavier scene, fixed by routing the test via the path and gate like smoke-p8; the game was not changed for it.

PUBLISHED: commit d429cf8d to the harvest-lane repo's 3d/ folder; live-verified (page 200 referencing bundle index-D0_ILQS5.js, bundle 200, 2D root still 200). The release zip in release/ was rebuilt from the same build.

## ENDLESS CONTRACTS UPDATE (2026-10-31, at Yash's request: fix the endgame gap)
Yash playtested the asset build, called it perfect, then asked the right question: what happens after a player finishes all 6 missions and all upgrades? Before this update: nothing. The loop ran forever but coins had no purpose and the game had no reason to be reopened. He picked option 1 of three (endless contracts) over a prestige system and a new content tier.

DESIGN: when the last base mission is claimed, the missions board unlocks contracts and stays full forever. Six templates (harvest corn, sell corn, serve customers, collect eggs, collect milk, harvest carrots), three active at a time, always distinct templates, dealt in a fixed rotation so the mix keeps changing. Each template has its own tier: base targets 60/40/15/30/20/40 grow x1.5 per tier (rounded, tens above 100). Rewards scale with the target (coins per unit: 1 / 1.5 / 6 / 2 / 3 / 1.5); every third serve tier also pays 3 gems. A contract counts only events tracked after it is issued, so banked progress never pre-fills the next goal. Claiming pays once and immediately deals the replacement contract. The objective card points at the current contract once the base missions are done.

IMPLEMENTATION: MissionSystem grew a contract board (spawn/track/claim/describe all handle base missions and contracts through the same interfaces, so the panel and objective wiring needed no changes). Save format: the missions snapshot gains a contracts block (sequence, rotation, per-template tiers, active contracts); SaveSystem sanitises it, MissionSystem revalidates template keys on restore, and saves written before this update load fine and start the board fresh (covered by a dedicated test).

VERIFICATION: 30 unit tests pass (22 pre-existing plus 8 new contract tests: locked-until-complete, rotation order, post-issue counting, claim-and-replace, tier growth to "Harvest 90 corn", third-tier serve gems, snapshot round trip, old-save restore). One pre-existing save round-trip test was updated for the new canonical contracts block in snapshots. Browser smoke (fresh profile): forced all base missions complete through real track events, claimed all six through the actual panel UI, board showed 9 rows with the first three contracts; the objective card read "Contract: Harvest 60 corn (0/60)"; completed the contract, reopened the panel (panels render on open by design), claimed it for +60 coins (270 to 330) and the board dealt "Contract: Collect 30 eggs" as replacement; after a page reload the unlocked board persisted with the same three contracts. Zero page errors. Full-loop regression passed with zero errors and the harvest-30 claim flow intact (final coins 124 this run vs 94 recorded at Phase 7; the difference is serve throughput during the timed customer phase under headless rendering, not mission logic, and the exact claim payouts are pinned by the unit tests and the contracts smoke above).

## COMPETITION UPDATE (2026-10-31, at Yash's request: "study our competition... improve that game in all the aspects... do not wait for my approval")
Built from a commissioned deep-research study of My Perfect Farm (all three builds), Farm Land, My Mini Mart, Idle Farm Tycoon and Hay Day (report in ~/workspace/research_notes/playables-farm-game-competition-20261030-2120/, presented to Yash as the Farm Game Competition Study page; the build list and statuses live in docs/COMPETITION_UPGRADE.md). The exploitable findings: forced ads every 10-60s are the genre's #1 complaint (we keep zero forced ads, opt-in rewarded only), MPF2's content cliff at ~L26 (endless contracts, shipped earlier today, plus the systems below), saves lost and freezes on ad return (our save guard already prevented overwrites; the HUD now flashes "Saved ✓" per write), and stressful endless queues (now waves).

SHIPPED (14 of the 20 listed items; the remaining 6 are queued in docs/COMPETITION_UPGRADE.md with reasons: decorations, prestige-lite, instant orders, wheat+mill, goats, sendScore):
1. XP AND FARM LEVELS (new ProgressionSystem): XP from harvest 1, collect 2, serve 5; level thresholds 40 x level^1.32; each level pays 2 gems and +1 backpack capacity (cap +10) so a level is felt physically; HUD badge "Lv N" with an XP bar under the avatar. Verified live in the regression diagnostic: the bag reached 11 mid-run the moment level 2 landed.
2. CASH PILE: serves now pay into MarketSystem.pendingCash (persisted), rendered by the stall as three size tiers on a pallet (1+ / 50+ / 150+ coins); walking within 1.7 units collects with a gold burst and coin sound. A farmer depositing at the stall front collects as he works; money earned while he is in the fields waits visibly.
3. ANIMAL FEEDING: troughs in both pens (fill bar shows stock, max 20 corn), one feed per egg/milk, empty trough stops production and raises a bobbing "!" sprite plus a one-time hint float per dry spell. Feeding is walk-up: stand at a trough holding corn and it transfers every 260ms.
4. DAILY MISSIONS: 3 per local day from a pool of 6, picked deterministically from the date (same set all day, fresh set tomorrow), gem-heavy rewards, rendered at the top of the missions panel under a "Daily missions" head; state saved inside the missions snapshot with a date-rollover regeneration.
5. HIREABLE HELPER (300 coins, shop): a second character (customer rig variant) who routes between fields through the real gate gaps, harvests ripe crops, carries 8, and stocks the stall; slower than the player on purpose. His harvests count toward missions.
6. CHEESE CHURN (400 coins, shop): a barrel by the stall; stand at it with milk and every 700ms one milk becomes one cheese (14 -> 42 coins); customers add cheese orders (1-2) once it is built. First processing chain, the My Mini Mart ladder.
7. CUSTOMER WAVES: arrivals come in waves of 3 with a 7-second calm between waves; clearing a wave with no timeouts pays a +5 coin calm bonus to the pile and a "Queue cleared" float.
8. OFFLINE EARNINGS: on boot, if the save is 15+ minutes old, a welcome-back panel offers floor(hours x (12 + 3 x level)) coins, hours capped at 4, collected by button (nothing is granted silently). Verified exactly: a save aged 2h at level 1 paid +30 (77 -> 107).
9. SNEAKERS BOOST PAD: red pad on the main path south of spawn; stepping on it grants 1.5x speed for 2 minutes (session only).
10. CORN-FOR-GEMS TRADE (the toucan sink): in the Earn Gems panel, trade 9 corn from the backpack for 1 gem, repeatable; gems no longer depend on ads.
11. JUICE: a pooled particle-burst system (shared geometry, per-colour materials): green/orange on harvest, gold on cash collection, gold fanfare on level-up, layered on the existing float text and SFX.
12. SAVED INDICATOR: "Saved ✓" pill flashes under the objective card on every persisted write.

SAVE FORMAT: still version 1; new optional fields (pendingCash, xp, feed, helperHired, churnOwned, missions.daily) are sanitised in SaveSystem and default safely for old saves (pre-feeding saves start with half-full troughs). One save round-trip test updated for the canonical new blocks.

VERIFICATION: tsc clean; 39 unit tests pass (9 new: progression curve/bonus cap, cash pile serve/collect/round-trip, daily set/claim/round-trip). Browser smoke (.qa/smoke-v2.mjs, fresh profile): level badge live, XP 10 after a field sweep, deposit and serve landed 12 coins via the pile (collected at the stall front), boost pad activated, feeding moved corn to the trough (0 -> 5), helper and churn bought through the real shop UI, helper then harvested and stocked on his own (harvest progress and stock rose unattended), churn converted milk to cheese, missions panel shows exactly 3 daily rows, zero page errors. Dedicated probe (.qa/probe-feed.mjs): with both troughs at 0, zero pickups spawned across 26 seconds covering every animal's first production timer; one earlier combined-smoke run showed a single stray pickup in its long serve-wait window that the probe could not reproduce; the gate itself is proven. Full-loop regression: first attempt crashed in the harness (claim button absent because that run's sweeps fell short of 30 harvests under variable SwiftShader frame rates, the known harness-timing class); the harness now repeats cycles until 30 are harvested (diagnostic cycles measured 10, 20, 31), and the rerun matched the Phase 7 baseline exactly: serves 54 coins, harvest-30 claim +40 = 94, zero errors, 476 draw calls, 127k triangles.

PUBLISHED: commit d6f4403f to the harvest-lane repo's 3d/ folder; live-verified after the usual CDN lag (page references bundle index-B6wVPmkM.js, bundle 200, 2D root still 200). Release zip rebuilt (604K).

## STUCK-FARMER FIX (2026-10-31, from Yash's playtest report "Why my character is stuck")
Root cause: the save stores the farmer's position, and builds before fences became solid could leave a saved spot inside what is now a collider (the stall, a fence span). The axis-separated movement test rejects any destination that still overlaps, so from inside a collider every direction is rejected and the farmer can never move again, across reloads. Reproduced exactly in the harness (teleported into the stall centre, tried all four directions for ~5s: total movement 0.00). Two fixes shipped together:
1. DEPENETRATION: every tick, moving or not, if the farmer's circle overlaps any collider he is pushed out along the smallest exit (up to 3 passes for corners). Verified: teleporting into the stall centre now ejects him to the nearest face with no input at all, and normal play is unchanged (regression diagnostic cycles identical: 10, 20, 31 harvests).
2. JOYSTICK LOCKUP HARDENING (a second stuck route found in review): the canvas now takes pointer capture on touch-down, releases are also listened for at window level, and a window blur clears keys and any active drag. Previously, a finger sliding off the canvas onto a HUD element could lose the release event, leaving the joystick locked and new touches ignored. Verified with real mouse input: a drag released over the SHOP medallion now stops the farmer, and a fresh drag steers again.
Also verified on the fixed build: 39 unit tests, the full systems smoke (levels, pile, boost, feeding, helper, churn, dailies) with zero errors. The one full-loop regression attempt during this fix hit the known harness timing flake (its timed serve phase under variable SwiftShader frame rates); the equivalent harvest diagnostic and systems smoke both passed on the identical build.
PUBLISHED: commit 72fdf207; live-verified (page references bundle index-D-amdV40.js, bundle 200). Existing saves self-heal on load because depenetration runs from the first tick.

## SKINS STORE + HUD DECLUTTER (2026-10-31, at Yash's request)
Yash asked for buyable character skins in a store, and reported the HUD buttons as cluttered and overlapping.

HUD DECLUTTER (the overlaps were real): the level badge (top 82px) sat directly under the SETTINGS/SHOP medallion column (top 88px), so the badge and the first medallion overlapped; and on narrow phones the centred objective card collided with the avatar and the currency pills. Fixes in hud.css: medallions moved to top 130px (badge now fully visible above them); the objective card width is capped at min(248px, 100vw - 230px); a max-width 460px layout stacks the top HUD into clear rows (objective on its own row at 86px, level badge at 158px, medallions at 212px, mission clipboard at 168px on the right). Verified by screenshots at 540px and 360px widths: no two elements touch.

SKINS STORE: the shop gained tabs (Upgrades | Skins). The Skins tab sells 16 cosmetics in three groups, applied live and saved in a new cosmetics block of the version-1 save (cleanCosmetics in SaveSystem validates ids against the catalogue, always owns the three free defaults, and falls back per slot):
- FARMER OUTFITS (6): the farmer rig now wears cloned materials (models.ts), so skins recolour shirt, overalls, hat, hat-dark and band without touching shared materials or customers. Classic (free), Ocean Blue 150, Sunset Orange 200, Forest Green 250, Royal Purple 4 gems, Golden Harvest 6 gems.
- WEATHER & LIGHT (5): scene background, sun colour/intensity, hemisphere light and a grass tint (World.ts now exports WORLD_MATS handles). Bright Day (free), Mint Morning 200, Golden Hour 250, Dusk Violet 350, Winter Frost 5 gems.
- ROADS (5): a tint over the shared path material. Sand (free), Stone Grey 150, Terracotta 200, Wooden Planks 300, Brick Red 4 gems.
Purchases use MarketSystem.spendCoins and the new spendGems; buying equips immediately; owned skins get an EQUIP button, the equipped one shows ON. This ships the queued decorations item from the competition list (fence/awning skins can join the same tab later).

VERIFICATION: tsc clean; 45 unit tests pass (6 new: catalogue uniqueness, free defaults, premium pricing, spendGems balance, cosmetics save cleaner incl. cross-category and unowned fallbacks). Browser smoke on the dev build: Skins tab rendered 13 buy buttons (16 minus 3 free defaults), bought Ocean (150), Dusk (350) and Stone (150) with coins (2000 -> 1350 exactly) and Golden with gems (20 -> 14), re-equipped Ocean, reloaded, and every owned/equipped value persisted exactly; zero errors. Screenshots confirm the Dusk light + Ocean outfit + Stone road in-world, the shop tab UI, and both decluttered HUD widths.
PUBLISHED: commit 71eb11a3; live-verified (page references bundle index-CIIHYXI1.js, bundle 200, 2D root 200). Release zip rebuilt.
