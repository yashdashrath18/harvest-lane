# Harvest Lane phase reports

## PHASE: 1, Foundation and playable prototype
STATUS: Complete (with two honest qualifications listed below)

IMPLEMENTED:
- Phaser 3 + TypeScript + Vite project scaffolded at ~/workspace/harvest-lane with modular structure (scenes, entities, systems, ui, data, integrations, utils), per the master plan.
- BootScene generates original code-drawn placeholder textures (grass, dirt, farmer, fence, bush). No reference game assets used anywhere.
- PreloadScene with loading bar UI and a loaderror handler that logs and continues.
- MainMenuScene with title and a working TAP TO PLAY button.
- GameScene: 1080x1600 grass world, crossing dirt paths, a fenced plot with a gate gap as a solid obstacle, bush decorations, depth sorting by feet position.
- Player entity: WASD movement, arrow-key movement, and click/tap-to-move through MovementSystem; keyboard input cancels a tap target; Arcade physics with world bounds and fence collision.
- Camera follows the player with bounds set to the world.
- Responsive scaling: Phaser Scale.FIT at a 540x960 portrait design resolution, letterboxed and centred on desktop.
- UIScene HUD: title bar, a real Moving/Idle status driven by player movement events through EventBus, and a controls hint. No fake currency or dead buttons.
- integrations/YouTubePlayablesAdapter.ts is a documented stub boundary only. The SDK is NOT integrated in Phase 1, by plan (Phase 8).

FILES CREATED OR MODIFIED:
- package.json, tsconfig.json, vite.config.ts, index.html, README.md
- GAME_DEVELOPMENT_TODO.md (copy of the master plan), reference/ (user-supplied screenshots and videos, reference only)
- src/main.ts, src/game/GameConfig.ts, src/game/GameConstants.ts, src/game/EventBus.ts
- src/scenes/BootScene.ts, src/scenes/PreloadScene.ts, src/scenes/MainMenuScene.ts, src/scenes/GameScene.ts, src/scenes/UIScene.ts
- src/entities/Player.ts, src/systems/MovementSystem.ts
- src/utils/MathUtils.ts, src/utils/StorageUtils.ts
- src/integrations/YouTubePlayablesAdapter.ts
- tests/movement.test.ts
- qa/phase1-menu-desktop.png, qa/phase1-menu-mobile.png, qa/phase1-game-start.png, qa/phase1-game-after-move.png, qa/phase1-game-narrow.png

TESTS EXECUTED:
- npm test (Vitest): 4 tests, movement arrival rule and math utils.
- npm run build: tsc --noEmit plus vite production build.
- Headless Chrome smoke test of the production build (Puppeteer, local): menu load, TAP TO PLAY click, scene state readback, keyboard D hold, tap-to-move click, camera scroll readback, console error collection, screenshots at 1280x800, 540x960, and 360x640 viewports.
- Note: the first smoke run caught one real console error, a favicon 404. An inline SVG favicon was added and the re-run reported zero console errors.

TEST RESULTS:
- Passed: all 4 unit tests.
- Passed: production build (dist/, about 1.5 MB, mostly the Phaser library; bundle size work belongs to Phase 9).
- Passed: menu renders (verified visually); TAP TO PLAY starts Game + UI scenes; player spawns at (540, 800); holding D moved the player right (540 to 586 in 0.7s under headless frame throttling); a tap at screen (100, 480) moved the player toward the world target (586 to 495, still walking when sampled); camera scroll followed (scrollX 294, scrollY 320); HUD status showed "Moving"; zero console errors on the final run.
- Failed: none outstanding.

KNOWN ISSUES:
- Headless movement distance per second is lower than the 230 px/s design speed because headless Chrome throttles the frame rate. Direction, arrival, and camera behaviour are verified; real-device speed feel needs a playtest on an actual phone or desktop browser.
- The Muse browser tool could not reach the VM's localhost, so the smoke test ran in local headless Chrome instead. Nothing about the game depends on that.

ACCEPTANCE CRITERIA:
- [x] Game launches in a browser.
- [x] Player is visible and controllable.
- [x] Controls work on desktop and mobile (keyboard and mouse verified in browser; touch uses the same pointer path, and the layout was verified at phone viewports; a physical phone tap test is still Yash's playtest).
- [x] Camera behaves correctly (follows, bounded).
- [x] Layout responds to viewport changes (1280x800, 540x960, 360x640 all rendered correctly).
- [x] No critical console errors (zero errors on final run).

Checklist items from the plan deferred by design, not silently dropped:
- Virtual joystick: the plan says "if needed". Tap-to-move covers mobile in Phase 1. Note that the reference game's real controls, from Yash's own footage analysed on 2026-10-30, use a virtual joystick. Decide before Phase 3 whether Harvest Lane should switch to joystick, tap-to-move, or both.
- Real artwork, animations, crop plots, cornfield, market stall and entrance: Phase 2 and 3 by plan. Phase 1 art is code-drawn placeholder.

## PHASE: 2, Farm world and visual environment
STATUS: Complete

IMPLEMENTED:
- Complete farm layout in GameScene: entrance road (vertical) and cross path (horizontal), dirt apron at the stall, perimeter fences with a gate gap at the south entrance, and an entrance sign reading HARVEST LANE beside the road.
- Three tilled soil areas with ploughed-row texture and wooden borders: two crop fields west (368x308 and 368x268) and the cornfield zone north-east (368x392). Fields are walkable; the Phase 3 crop system will plant into them.
- Market stall: original code-drawn structure with striped awning, posts, counter and produce crates. The counter front is solid.
- Original farmer art replacing the Phase 1 placeholder: straw hat with band, face, red shirt, denim overalls, arms, boots, plus a soft ground shadow that follows the player.
- Fruit trees with baked ground shadows; tree trunks are solid. Bushes, flower tufts and stones decorate the grass.
- Depth sorting throughout: the player renders behind tree canopies when north of them and in front when south, verified in the behind-tree screenshot.
- Virtual joystick (the control decision flagged in the Phase 1 report, approved by Yash on 2026-10-30): floating design, the base appears at the press point and the knob tracks the drag, with analogue speed via a unit-tested vector function. It coexists with tap-to-move: a short press that never drags is treated as a tap and sets a walk target; engaging the joystick cancels any tap target. Keyboard keeps top priority. HUD hint updated.
- New textures are all generated in BootScene (soil, tree, stall, sign board, vertical fence, flower, stone, joystick base and knob). No external or reference artwork is used.

FILES CREATED OR MODIFIED:
- src/scenes/BootScene.ts (rewritten texture set)
- src/scenes/GameScene.ts (full world build)
- src/scenes/UIScene.ts (controls hint)
- src/entities/Player.ts (joystick integration, tap-on-release)
- src/systems/MovementSystem.ts (joystick priority layer)
- src/ui/VirtualJoystick.ts (new)
- src/utils/MathUtils.ts (joystickVector)
- src/game/GameConstants.ts (spawn moved to the path crossroads, 540, 910)
- tests/movement.test.ts (joystick vector tests)
- qa/phase2-*.png (8 screenshots)

TESTS EXECUTED:
- npm test (Vitest): 7 tests.
- npm run build: tsc --noEmit plus vite production build.
- Headless Chrome runs of the production build: joystick drag, tap-to-move, keyboard, camera follow, stall collision walk test, and teleports for zone screenshots (spawn, cornfield, stall, entrance, behind-tree).

TEST RESULTS:
- Passed: all 7 unit tests (including joystick zero, proportional and clamped vectors).
- Passed: production build.
- Passed: joystick drag moved the player right (540 to 630) with the base and knob visibly rendered; releasing stopped input.
- Passed: tap-to-move still works after the joystick change (630 to 482 toward the tap).
- Passed: stall collision. Player teleported beside the stall walked right under keyboard input and stopped at x 713, exactly the counter's left edge minus the body offset. Note: the first collision attempt was invalidated by a leftover tap target from the previous step (a test-script issue, not a game bug); the re-run cleared the target first and passed.
- Passed: depth sorting visually verified (player occluded by tree canopy from behind).
- Passed: zero console errors in all runs.

KNOWN ISSUES:
- The soil texture reads slightly dark and flat at field scale. Acceptable for prototype art; can be lightened when real art direction is set.
- The farmer is still a single front-facing frame. Directional sprites and walk animation are Phase 3, per the plan.
- Headless frame throttling still makes measured movement speed lower than design speed; playtest on a real device remains the check for game feel.

ACCEPTANCE CRITERIA:
- [x] Environment art displays correctly (verified in screenshots of every zone).
- [x] Objects are sorted correctly (tree occlusion test).
- [x] Player collides with obstacles (fences from Phase 1, stall counter and tree trunks new, stall numerically verified).
- [x] World feels like a farm rather than a test scene (entrance, sign, paths, fields, cornfield, stall, trees and decor all present and connected).

## PHASE: 3, Player, crops, harvesting and inventory
STATUS: Complete

IMPLEMENTED:
- Directional player animation: original code-drawn farmer frames for down, up and side views (right reuses side art flipped), two walk frames each with leg and arm swing; frame 0 is the idle pose and the facing follows the velocity direction.
- Crop data model (src/data/CropData.ts): corn with growth time, regrow time, sell price, yield and stage count, data-driven for later phases.
- Crop entity and CropSystem: 152 plots across the three Phase 2 fields on a 46px grid, time-based growth over 4 stages (sprout, young, tall, ripe with cobs), staggered initial growth with about 1 in 6 plots starting ripe. Readiness now matches the ripe visual stage exactly (fixed after the first test run showed cobs up to 6 seconds before the crop counted as harvestable).
- Interaction, three ways: walk into range and the nearest ready crop gets a highlight ring, then press E or Space, or tap the on-screen HARVEST button (lit when a crop is in range, dim otherwise); or tap a crop directly and the player walks to it and harvests on arrival.
- Harvesting: adds the yield to the backpack, starts regrowth (14s for corn), plays a pop tween and a floating "+1 Corn" text.
- Backpack (capacity 10): pure-logic BackpackSystem with add/remove that respect capacity and report how much actually fit. HUD shows "Bag n/10" and turns red at full. Harvesting with a full bag is refused with a "Backpack full" message and the crop stays ripe; nothing is silently lost.
- EventBus rebuilt as a tiny standalone emitter (no Phaser dependency) so pure systems can be unit tested in Node; the first backpack test run failed on exactly that dependency and the decoupling is the fix.

FILES CREATED OR MODIFIED:
- src/data/CropData.ts (new), src/entities/Crop.ts (new)
- src/systems/CropSystem.ts (new), src/systems/BackpackSystem.ts (new)
- src/entities/Player.ts (animation, tap interception hook)
- src/systems/MovementSystem.ts (unchanged this phase; joystick work was Phase 2)
- src/ui/VirtualJoystick.ts (press tracking fix, action button exclusion zone)
- src/scenes/BootScene.ts (farmer frames, corn stages, highlight ring)
- src/scenes/GameScene.ts (crop wiring, harvest loop, floating text)
- src/scenes/UIScene.ts (bag counter, harvest button)
- src/game/EventBus.ts (standalone emitter, new events)
- tests/backpack.test.ts (new), tests/movement.test.ts (unchanged)
- qa/phase3-*.png (3 screenshots)

TESTS EXECUTED:
- npm test (Vitest): 10 tests, including backpack capacity, partial fit and removal rules.
- npm run build.
- Headless Chrome run of the production build driving the real loop, plus a follow-up invariant check after the readiness fix.

TEST RESULTS:
- Passed: 10 of 10 unit tests; production build.
- Passed: 152 crops planted, 47 ripe at first check. Stood next to a ripe crop and pressed E: backpack 0 to 1, the crop returned to stage 0 regrowing.
- Passed: tap-to-harvest on a distant crop: the player walked there and the backpack went 1 to 2 with no further input.
- Passed: growth fast-forward and stage textures advance; after the readiness fix, an invariant check over all 152 crops found 0 mismatches between "looks ripe" and "is harvestable".
- Passed: backpack filled to 10, harvest attempt refused, total stayed 10 and the crop stayed ripe.
- Passed: walk animation live in browser (player texture sampled as player-side-1 mid-stride while holding A); HARVEST button visibly lit near a crop and dim away from crops.
- Passed: zero console errors in all runs.

KNOWN ISSUES:
- Two test-script faults were found and fixed during verification (a dropped evaluate argument, and the initial stagger producing no ripe crops at spawn, fixed in CropSystem). Neither was a shipping-code bug; the readiness/stage mismatch was, and is fixed.
- The highlight ring can visually overlap the player when standing directly below a crop. Cosmetic only.
- Corn is the only crop, per the plan's Phase 3 scope. Sell price exists in data but coins arrive with the market in Phase 4.

ACCEPTANCE CRITERIA:
- [x] Player animation changes with movement direction.
- [x] Player can reach and interact with crops (proximity highlight plus E, Space, button, and tap-to-crop).
- [x] Crops show growth stages and become harvestable (4 stages, ripe stage equals harvestable).
- [x] Backpack total updates correctly (HUD counter driven by real events, capacity enforced with feedback).
- [x] The player cannot walk infinitely in one direction (world bounds and collisions from Phases 1 and 2, unchanged).

## PHASE: 4, Market, orders and customer AI
STATUS: Complete

IMPLEMENTED:
- MarketSystem (pure logic, unit tested): stall stock per item and the coin wallet. Serving is atomic: an order only completes when the full quantity is in stock, pays quantity times sell price, and changes nothing on failure.
- Stocking loop: standing at the stall front transfers corn from the backpack to stall stock one unit every 160ms with a floating "+1", and a "Stock n" label over the stall tracks the real count.
- Customers: three original NPC looks drawn in code. They spawn at the south gate (first after about 2.6s, then roughly every 9.5s, max 3 queued), walk up the entrance road, and queue at three slots in front of the stall. Waypoint steering only; the route crosses no obstacles.
- Orders: a bubble over each waiting customer shows the corn icon and quantity (deterministic early pattern 2, 4, 3, 5, so first-time pacing is readable), plus a patience bar (45s) that shrinks and shifts green to yellow to red.
- Serving: the front waiting customer is checked every 300ms; if stock covers the order they are served, a "+N coins" text floats up, their bubble hides, and they walk back to the gate and despawn. The queue advances into freed slots.
- Timeout: patience out means the customer leaves unserved for no penalty and no coins; verified separately from the serve path.
- HUD: the Phase 1 Moving/Idle diagnostic readout is retired; the top bar now shows Bag and Coins, both driven by real events.

FILES CREATED OR MODIFIED:
- src/systems/MarketSystem.ts (new), src/systems/CustomerSystem.ts (new)
- src/entities/Customer.ts (new)
- src/scenes/BootScene.ts (customer variants, order bubble, corn icon)
- src/scenes/GameScene.ts (market wiring, deposit loop, serve loop, stock label)
- src/scenes/UIScene.ts (coins counter replaces status readout)
- src/game/EventBus.ts (CoinsChanged, StockChanged)
- tests/market.test.ts (new)
- qa/phase4-customer-queue.png, qa/phase4-served.png

TESTS EXECUTED:
- npm test (Vitest): 13 tests.
- npm run build. One TypeScript fault found and fixed during the build (Customer container constructing children before super); the shipped structure creates children first, then calls super, then assigns fields.
- Headless Chrome run of the production build driving the full loop with timed waits.

TEST RESULTS:
- Passed: 13 of 13 unit tests (stock tracking, full-order payment math at corn price 6, partial-order refusal with no state change).
- Passed: first customer spawned, walked to slot (756, 1448), waited with an x2 bubble.
- Passed: deposit loop: player given 8 corn at the stall front, backpack drained into stock at the designed rate.
- Passed: serve: coins 0 to 12 (2 corn at 6), stock reduced by the order, customer marked served and walked home; a second customer spawned on the timer and walked in meanwhile.
- Passed: timeout path: stock cleared, patience forced low, customer left unserved, coins unchanged at 12.
- Passed: zero console errors.
- Note on snapshots: stock and bag counts were sampled by polling while deposits and a serve were in flight, so individual snapshots interleave; the conserved totals (deposited = served + remaining stock) and the coin math check out.

KNOWN ISSUES:
- The order bubble of a queued customer overlaps the stall counter visually. Readable, and it points at the stall, but the bubble could ride higher in the Phase 7 polish pass.
- Customers walk through each other if their paths cross while slots advance; acceptable at this scale, no collision between NPCs.
- Only corn can be ordered, matching the plan's Phase 4 scope (corn first product).

ACCEPTANCE CRITERIA:
- [x] Stall stock increases after the player deposits produce.
- [x] Customers spawn, walk and queue correctly.
- [x] Order bubbles are visible (icon, quantity, patience bar, screenshot-verified).
- [x] Customer leaves after being served.
- [x] Coins increase by the correct amount (2 x 6 = 12 observed).
- [x] A customer without enough available stock is not incorrectly marked as served (partial orders refused in unit tests; timeout path verified live).

## PHASE: 5, Economy, upgrades and areas
STATUS: Complete

IMPLEMENTED:
- Wallet completed: coins already existed; spending is now a checked operation (spendCoins refuses overdrafts and changes nothing), and gems exist as a real balance with a HUD readout. Gems have no source yet by design: their first source is Phase 6 mission rewards, next in the plan. No fake ad or purchase route to gems exists or will be added.
- Upgrade data (src/data/UpgradeData.ts) and UpgradeSystem (pure logic): four tracks with three levels each. Backpack (capacity 10 to 16 to 24 to 34), Swift Boots (+12% speed per level), Fertilizer (+15% growth and regrow speed per level), Market Charm (+10% sell prices per level, rounded). Buying checks max level and funds, spends once, and never resets other progress.
- Effects are applied to the live systems after every purchase: BackpackSystem.setCapacity, Player.speedMultiplier, CropSystem.timeScale (growth uses scaled elapsed time), MarketSystem.priceMultiplier.
- Plan mapping note: the checklist's "harvest speed" has no separate lever in this design because harvesting is instant; its meaningful equivalent is crop cycle speed, which is what Fertilizer raises. Recorded here rather than silently renamed.
- Area unlock: the South Field (south-west grass, 368x308) starts fenced with a solid fence ring and a "South Field, Locked: 150 coins" label. Unlocking from the shop spends 150 coins, removes the fences and label, draws the soil field and plants 48 corn plots (total 152 to 200). Decor that stood inside the area was relocated in Phase 5 (one tree, one bush, one stone, one flower) rather than left buried in the field.
- Shop UI: SHOP button bottom-left opens a panel and pauses the world; closing resumes. Every row shows level, current and next effect, and a buy button that is green only when affordable, grey otherwise, and MAX at the cap. Purchases are single-tap with no confirmation dialog, per the plan, and travel over the EventBus so they apply while the world is paused. The HUD top bar now shows Coins and Gems.
- Starting areas from the plan (Starter Farm) is the existing farm; Chicken Farm, Dairy Farm and Vegetable Garden belong with their Phase 6 content, and the South Field proves the unlock mechanism they will reuse.

FILES CREATED OR MODIFIED:
- src/data/UpgradeData.ts (new), src/systems/UpgradeSystem.ts (new)
- src/systems/MarketSystem.ts (spendCoins, addCoins, gems, price multiplier in serve)
- src/systems/BackpackSystem.ts (setCapacity)
- src/systems/CropSystem.ts (addField for unlocks, timeScale)
- src/entities/Crop.ts (scaled growth), src/entities/Player.ts (speedMultiplier)
- src/scenes/GameScene.ts (upgrade wiring, locked area, shop request handlers)
- src/scenes/UIScene.ts (gems readout, SHOP button, shop panel)
- src/game/EventBus.ts (GemsChanged, shop events)
- tests/upgrades.test.ts (new)
- qa/phase5-shop.png

TESTS EXECUTED:
- npm test (Vitest): 17 tests.
- npm run build.
- Headless Chrome runs of the production build: purchase flow through the real scene methods, locked-fence walk test (twice, see below), area unlock, shop open and close with pause checks.

TEST RESULTS:
- Passed: 17 of 17 unit tests, including refused purchases changing nothing, max level charging stopping, and the +10% price serve paying 13 for a 2-corn order.
- Passed in the live build: 500 coins granted for the test; Backpack bought (coins 460, capacity 16, HUD later showed Bag 0/16), Boots (player speed multiplier 1.12), Fertilizer (growth factor 1.15), Charm (price multiplier 1.1, live serve paid 13). Drained to 5 coins: next purchase refused, level and coins unchanged.
- Passed: unlock flow: 205 coins to 55 after the 150 cost, crops 152 to 200, second unlock attempt refused.
- Passed: locked fence: the player walking west into the South Field fence stopped at x 473, exactly the fence body edge (458) plus the player body reach (15). The first sample read 486 because headless frame throttling had not carried him to the fence yet within the fixed wait; the follow-up run polled until contact and confirmed 473. A test-timing artifact, not a game fault.
- Passed: shop panel opens with the game paused and closes with it resumed; screenshot shows all four tracks at Lv 1/3 with correct next effects, grey unaffordable buttons at 55 coins, and South Field marked unlocked.
- Passed: zero console errors in all runs.

KNOWN ISSUES:
- A fading floating text from the world can show through the shop panel's edge while paused. Cosmetic only.
- Gems cannot be earned yet (Phase 6 missions are the source). The HUD shows a truthful 0.
- The shop pauses customers and crops while open. That is a deliberate, disclosed choice for this phase.

ACCEPTANCE CRITERIA:
- [x] Upgrade prices are displayed (panel rows with next-level costs).
- [x] Purchase buttons respond immediately (single tap, no dialog).
- [x] Purchased upgrades change actual values (capacity, speed, growth, prices all read back live).
- [x] Locked areas cannot be entered before purchase (fence contact verified numerically).
- [x] Insufficient coins prevent the purchase (unit tests and live refusal, state unchanged).
- [x] Buying one upgrade does not reset another (levels are independent; verified in tests and live buys).

## PHASE: 6, Missions, animals and additional content
STATUS: Complete

IMPLEMENTED:
- Missions: MissionData with six missions (Harvest 30 corn, Sell 25 corn, Serve 10 customers, Collect 20 eggs, Harvest 120 corn, Unlock a new area) and a pure-logic MissionSystem that tracks real gameplay events (harvests from tryHarvest, sells and serves from the customer serve hook, collections from animal pickups, area unlocks) and pays rewards exactly once.
- Missions panel: TASKS button opens a panel (world pauses, same pattern as the shop) listing every mission with live progress, its reward, and a state button: progress fraction while active, green CLAIM when complete, DONE after claiming. Claiming Serve 10 customers pays the first gems in the game (3), closing the Phase 5 note that gems had no source yet.
- Chickens and eggs: a fenced pen east of the crossroads (gate gap on the south side) with 3 original code-drawn chickens that wander, peck with a two-frame idle, and lay an egg roughly every 13 seconds each (max 6 on the ground). Eggs are collected by walking over them into the backpack.
- Cows and milk: a second pen south of the chickens with 2 cows that wander and graze (two frames), producing a milk can roughly every 21 seconds each (max 4). Same walk-over collection.
- Full economy integration: egg (9 coins) and milk (14) prices live in ItemData alongside crop prices; the stall deposit loop now transfers any stocked item (corn, carrot, egg, milk), the stock label shows all four counts, and customer orders cycle through a pattern that now includes egg x2/x3 and milk x1/x2 orders with matching bubble icons.
- New crop: carrots (30s growth, 18s regrow, 8 coins, four growth stages drawn in code). The South Field now plants carrots on unlock instead of corn, carrot orders join the customer pattern only after the unlock makes them obtainable, and the Phase 5 shop blurb was corrected to say carrot plots.
- Supporting fixes: three decor items that stood inside the new pens were relocated; the virtual joystick gained an exclusion zone for the left-side HUD buttons so opening panels never starts a joystick drag or a stray tap target.
- Per the plan, no production machines were added; the core was stable but machines are explicitly a later step.

FILES CREATED OR MODIFIED:
- src/data/MissionData.ts (new), src/data/ItemData.ts (new)
- src/systems/MissionSystem.ts (new), src/systems/AnimalSystem.ts (new)
- src/data/CropData.ts (carrot), src/data/UpgradeData.ts (South Field blurb)
- src/systems/MarketSystem.ts (prices from ItemData), src/systems/CropSystem.ts (addField takes a crop definition), src/systems/CustomerSystem.ts (multi-item order pattern with carrot gating)
- src/scenes/BootScene.ts (chicken and cow frames, egg and milk pickups, carrot stages, item icons)
- src/scenes/GameScene.ts (pens, animals, mission hooks and claim handling, generic deposit, four-item stock label, South Field plants carrots)
- src/scenes/UIScene.ts (TASKS button, missions panel)
- src/ui/VirtualJoystick.ts (left button exclusion zone)
- src/game/EventBus.ts (mission events)
- tests/missions.test.ts (new)
- qa/phase6-chicken-pen.png, qa/phase6-missions.png
- QA tooling moved from /tmp to ~/workspace/harvest-lane/.qa/ after /tmp was cleaned between sessions; it is dev tooling, not part of the game build.

TESTS EXECUTED:
- npm test (Vitest): 21 tests.
- npm run build.
- Headless Chrome run of the production build covering orders, production, pickups, claims (API and real panel button), and the carrot unlock.

TEST RESULTS:
- Passed: 21 of 21 unit tests, including mission item filtering, claim-once semantics, incomplete-claim refusal and gem rewards.
- Passed: order pattern across the first spawns ran corn x2 (timer spawn), egg x2, corn x4 (manual spawns), with the fourth refused because the queue caps at 3, exactly as designed.
- Passed: 5 animals present; forced production timers put 3 eggs and 2 milk on the ground; walking over one of each put 1 egg and 1 milk in the backpack and advanced Collect 20 eggs to 1/20 through the real event hook.
- Passed: mission claim through the scene paid 40 coins for Harvest 30 corn and refused a second claim.
- Passed: with Serve 10 customers completed, the real CLAIM button in the panel was clicked and gems went 0 to 3; the panel screenshot shows DONE, CLAIM and progress states correctly side by side.
- Passed: South Field unlock planted exactly 48 carrot crops, enabled carrot orders, and recorded the area mission progress.
- Passed: zero console errors.

KNOWN ISSUES:
- A tree at the cow pen's top-left corner overlaps the pen fence visually. Cosmetic.
- Chickens can lay an egg a few pixels outside their sprite but still inside the pen; pickups never spawn outside pens because they anchor to the animal.
- Wheat, tomatoes, pumpkins and strawberries from the plan's future crop list are not added; carrots are this phase's gradual activation, and the data model now makes each further crop a definition plus textures.

ACCEPTANCE CRITERIA:
- [x] Mission progress changes because of real gameplay actions (harvest, sell, serve, collect and unlock hooks verified live).
- [x] Completed missions can be claimed exactly once (unit tests, scene API, and the panel button).
- [x] Animals produce items on a visible cycle (timers verified; egg and milk seen on the ground in screenshots).
- [x] Animal products can be collected and sold (pickup to backpack verified; deposit loop and order pattern cover eggs and milk, prices in ItemData).
- [x] Chickens remain inside the pen (fences are solid with a player-sized gate gap; animals wander only within pen bounds by construction).

## PHASE: 7, UI, animation and audio polish
STATUS: Complete

IMPLEMENTED:
- Unified UI style: a UIStyle module now holds the shared font, panel colour, text colours and button colours, and the new UI built this phase uses it. Existing panels already shared the same dark-panel look and were aligned to it.
- Currency display: coin and gem icons beside the counters, and the counters pulse when their value changes.
- Objective display: an always-visible pill under the top bar shows the current mission and progress ("Objective: Harvest 30 corn (1/30)"), switches to a claim reminder when a mission completes, and updates live from gameplay events. The game has no player level by design (missions are the progression), so no level badge was invented.
- Inventory indicator: a fill bar under the bag counter fills green, then orange, then red as the backpack fills, alongside the existing count and full-bag colour change.
- Settings panel: a gear button opens a panel (world pauses) with independent Music and Sound effects sliders. Both apply live and persist through StorageUtils; verified in localStorage. The panel honestly notes that progress saving arrives in the next phase rather than pretending otherwise.
- The locked South Field sign is now tappable and opens the shop, polishing the area unlock path.
- Button feedback: every round button and panel purchase or claim button gives a press squash or a click sound; panels grow and fade in on open.
- Harvest particles: harvesting bursts green and yellow dots from the crop.
- Selling feedback: on a serve, four coin sprites fly from the customer to the HUD coin counter while the counter pulses.
- Customer reactions: served customers pop a happy face, timed-out customers a disappointed one, as they leave.
- Crop and animal polish: ready crops breathe with a gentle scale pulse (verified not to fight the harvest pop tween), and standing near a growing crop with no ready crop in range shows its exact growth percentage.
- Audio, all synthesized with WebAudio, zero audio files: an original gentle chord progression (I V vi IV in C) with soft pentatonic plucks as background music; harvest pop, pickup chirp, coin two-tone, mission success arpeggio, upgrade chime, backpack-full error, UI click, and ambient chicken clucks and cow moos when the player is near a pen. Audio starts on the first user gesture per browser rules. Music and effects run through independent gain channels driven by the settings sliders.
- The virtual joystick gained an exclusion zone for the gear button so opening settings never starts a drag.

FILES CREATED OR MODIFIED:
- src/systems/AudioSystem.ts (new), src/ui/UIStyle.ts (new)
- src/scenes/BootScene.ts (coin, gem, sparkle dots, happy and sad emotes, gear textures)
- src/scenes/GameScene.ts (objective emission and request handshake, mission-completion detection with jingle, harvest burst, coin fly, growth hint, ready-crop pulse, ambient animal sounds, tappable locked sign, sound wiring)
- src/scenes/UIScene.ts (objective pill, bag fill bar, currency icons and pulses, gear button, settings panel with draggable sliders, press feedback, panel transitions, click sounds)
- src/systems/MissionSystem.ts (rows now expose rewardKind), src/systems/AnimalSystem.ts (nearestKind for ambience), src/systems/CustomerSystem.ts and src/entities/Customer.ts (emotes), src/entities/Crop.ts (progress01)
- src/ui/VirtualJoystick.ts (gear exclusion zone), src/game/EventBus.ts (objective and open-shop events), src/main.ts (audio QA hook)
- tests/audio.test.ts (new)
- qa/phase7-settings.png, qa/phase7-settings-drag.png

TESTS EXECUTED:
- npm test (Vitest): 24 tests.
- npm run build.
- Three headless Chrome runs covering the objective pill, harvest path, growth hint, emotes, and the settings sliders by real clicks and drags.

TEST RESULTS:
- Passed: 24 of 24 unit tests, including audio settings defaults, independent volume updates without an audio context, and effect calls being safe before the context exists.
- Passed: the objective pill reads "Objective: Harvest 30 corn (0/30)" on boot and "(1/30)" after a real harvest (a lost first emission was found and fixed with a request handshake between the scenes).
- Passed: growth hint shows "4%" beside a just-regrown patch with the highlight ring correctly off.
- Passed: customer emote adds its sprite to the customer (child count 3 to 4).
- Passed: settings panel opens with the game paused; clicking the music slider set music volume to exactly 0.25 and localStorage holds {"musicVolume":0.25,"sfxVolume":0.9}; dragging the effects slider set it to 0.833, matching the drag distance; closing resumes the game.
- Passed: zero console errors in all runs. Headless Chrome cannot prove the audio is audible, only that the context, gains and scheduling run without errors; the listening check is part of the user's playtest.

KNOWN ISSUES:
- The bag fill bar sits over the top fence line in the HUD; it reads clearly but is a tight fit.
- Panel close is instant while panel open animates; a matching close animation is a small future nicety.
- Ambient animal sounds use Math.random, so their timing varies by design; volume follows the effects slider.

ACCEPTANCE CRITERIA:
- [x] Every visible button works (gear, sliders, close buttons, sign-to-shop all exercised).
- [x] Text is readable at mobile sizes (objective pill, growth percent, settings labels all 15px or larger with contrast backgrounds).
- [x] Panels do not overlap incorrectly (one panel at a time is enforced across shop, missions and settings).
- [x] Animations are smooth (tween-based transitions, pulses and particles; no layout thrash).
- [x] Sound controls work and persist (verified numerically and in localStorage).
- [x] Visual style is consistent (UIStyle constants, shared panel treatment).

## PHASE: 8, Save system and YouTube Playables integration
STATUS: Complete

IMPLEMENTED:
- Versioned save schema (version 1) covering coins, gems, stall stock, backpack contents, upgrade levels, the South Field unlock, mission progress and claimed state, player position, and audio volumes. One schema serves both backends.
- SaveSystem with strict, never-throwing validation: dirty numbers are normalised, unknown item, upgrade and mission ids are dropped by the owning systems on restore, future-version saves are refused, and a migration chain point is marked for when version 2 arrives. A corrupt local payload is copied to a backup key before being discarded, and the game starts fresh instead of crashing.
- Every stateful system gained snapshot and restore: MarketSystem, BackpackSystem (restores through add(), so capacity rules cannot be violated), UpgradeSystem (clamps to max level, ignores unknown tracks), MissionSystem.
- Autosave every 5 seconds, immediate saves on milestones (upgrade purchase, area unlock, mission claim), and a save when the tab hides in standalone mode. Reload recovery restores the full state, verified below.
- Crop growth timers, customers and animal timers are deliberately not saved: fields replant with staggered growth on load. Documented here so the behaviour is a decision, not an omission.
- YouTube Playables adapter (src/platform/YouTubePlayablesAdapter.ts), written against the official SDK reference and integration requirements checked on 2026-10-30:
  - The SDK script (https://www.youtube.com/game_api/v1) loads in index.html before any game code, as required. The adapter only reads the ytgame global and guards every call.
  - firstFrameReady fires at boot; gameReady fires from the main menu when it is interactable, in that order (verified in the mock run's call log).
  - Cloud saves: loadData is awaited before any saveData, per the requirements. In the Playables environment, progress is stored only in the cloud; localStorage carries no progress there (verified: no local key written). Standalone mode uses localStorage with the same serialized format.
  - Audio: the platform state (isAudioEnabled at boot, onAudioEnabledChange after) drives a platform mute inside AudioSystem that multiplies both gains, so in-game sliders cannot override a platform mute, per the requirements. Volume preferences travel inside the cloud save in this environment.
  - Pause and resume come only from onPause and onResume in the Playables environment (the Page Visibility API is used only for standalone autosave, never for platform pause). onPause saves first, suspends audio, and pauses the scene; onResume undoes only a platform pause, never a panel pause.
  - Rewarded ads: the adapter exposes requestRewardedAd, which resolves the SDK's confirmed boolean. No in-game placement calls it yet, because adding an ad-for-currency offer is a product decision, not a technical one. No fake ad or reward behaviour exists.
- The settings panel note now truthfully says progress and volumes save automatically.

FILES CREATED OR MODIFIED:
- src/systems/SaveSystem.ts (new), src/platform/YouTubePlayablesAdapter.ts (new)
- src/systems/MarketSystem.ts, src/systems/BackpackSystem.ts, src/systems/UpgradeSystem.ts, src/systems/MissionSystem.ts (snapshot and restore)
- src/systems/AudioSystem.ts (platform mute, suspend and resume, gain maths centralised, localStorage skipped in the Playables environment)
- src/scenes/GameScene.ts (persistence setup, collectSave, applySave, saveNow, autosave, milestone saves, unlock split into purchase and world-application halves)
- src/scenes/MainMenuScene.ts (gameReady), src/main.ts (firstFrameReady), index.html (SDK script before game code), src/scenes/UIScene.ts (settings note)
- tests/save.test.ts (new)
- qa runs: smoke8 (standalone), smoke8c (corruption), smoke8b (mock SDK)

TESTS EXECUTED:
- npm test (Vitest): 29 tests.
- npm run build.
- Three headless Chrome runs: standalone save, reload and corruption; and a mock-SDK Playables run.

TEST RESULTS:
- Passed: 29 of 29 unit tests, including serialize and parse round-trip, rejection of garbage and future versions without throwing, dirty-field normalisation, per-system round trips, upgrade clamping, and backpack capacity enforcement on restore.
- Passed (standalone): a built state (200 coins, boots bought for 35, 5 corn stocked, 2 eggs carried, mission progress 7, player moved) was stored with every field correct, and after a real page reload every value came back exactly: 165 coins, boots level 1, stock 5, eggs 2, progress 7, player at (300, 700).
- Passed (corruption): with a broken payload planted before boot, the game started fresh at 0 coins, the broken text was preserved under the corrupt-backup key, and there were no errors. (The first corruption attempt was overwritten by the game's own tab-hide exit save during reload, which is correct product behaviour; the retest planted the corruption at document start.)
- Passed (mock SDK): call order was firstFrameReady, gameReady, loadData. The mock cloud save applied in full (777 coins, mission progress 11, music volume 0.4). Platform audio-disabled muted the game. Platform pause saved (saveData received the live state) and froze the scene; resume unfroze it; a platform audio-enable unmuted. No local save key was written in the environment.
- The sandbox could not reach youtube.com (tunnel failure), so the real SDK script failed to load in these runs and the game booted and played regardless, which is itself the required standalone fallback behaviour.

KNOWN ISSUES AND NOT VALIDATED:
- NOT validated against the real Playables environment or the official SDK Test Suite: access is still pending the early-access application, so the adapter is verified against the official documentation and a faithful mock only. This must be retested in the Test Suite before any submission (Phase 10).
- The rewarded-ad wrapper is unvalidated against the real SDK and intentionally unused by gameplay.
- In the Playables environment, if the cloud load fails, play continues unsaved-to-cloud for the session rather than blocking the game; the docs' load-before-save rule is still honoured because saves await the settled load.

ACCEPTANCE CRITERIA:
- [x] Standalone browser mode works without the SDK (including when the SDK script itself fails to load).
- [x] Playables lifecycle integration follows current official docs (load order, firstFrameReady before gameReady, loadData before saveData, platform mute supremacy, onPause and onResume only).
- [x] Pause and resume preserve a valid game state (platform pause saves first; panel pauses are never undone by platform resume).
- [x] Save and load work in each supported environment (localStorage standalone, cloud in the mock environment; real environment pending access).
- [x] No fake ad or reward behaviour exists.

## PHASE: 9, QA, compatibility and performance
STATUS: Complete

TESTS EXECUTED:
- Full automated suite: 29 Vitest tests, all passing.
- Production build (npm run build) and the production preview build for every browser test below.
- smoke9: an end-to-end regression of the whole core loop in one session.
- smoke9b: viewport matrix (five sizes) plus a mid-game resize.
- smoke9c: touch joystick drag on an emulated mobile device, mouse tap-to-move on desktop.
- smoke9d and perf-menu: frame rate, heap, display list and load-time sampling.
- Save and reload recovery were re-verified in Phase 8 and not repeated here.

GAMEPLAY REGRESSION (smoke9), ALL PASSED:
- Keyboard: D and W moved the player right and up.
- Collision: a tap target through the market stall stopped the player at the stall (x 696 to 700 across runs; the player never passed through).
- Harvest with the E key: backpack 0 to 1 corn.
- Deposit at the stall: stock 0 to 1, backpack emptied.
- Serve: with 3 corn stocked, a corn x3 order was served for exactly 18 coins.
- Purchase validation: boots bought through the checked purchase path (insufficient-balance refusal was covered by earlier unit and browser tests).
- Area unlock: South Field unlocked, exactly 48 carrot crops planted, area mission progress 1.
- Mission claim: claiming the completed area mission paid exactly 5 gems.
- Animals: forced production, egg collected by walking over it (backpack egg 1).
- Panels: SHOP button paused the game, its close button resumed it.
- Zero console errors across the whole session.
- Two test-design faults were found and fixed during the run, both in the test, not the game: the front order needed 2 corn while only 1 was stocked (orders are atomic by design), and the first customers had legitimately timed out under the 45 second patience during the long script. Both were corrected by playing the loop properly (stock first, fresh queue).

DEVICE AND BROWSER MATRIX (smoke9b), ALL PASSED:
- Narrow mobile 360x640: canvas 360x640, gameplay active.
- Common mobile 390x844: canvas 390x693 (Scale.FIT), gameplay active.
- Mobile landscape 844x390: canvas 219x390 pillarboxed and centred, gameplay active and the menu button clickable at transformed coordinates.
- Tablet 768x1024: canvas 576x1024, gameplay active.
- Desktop 1280x800: canvas 450x800, gameplay active.
- Mid-game resize 540x960 to 390x844: canvas re-fitted, player and world intact.
- Zero console errors in every viewport.
- Screenshots: qa/phase9-narrow-mobile.png, qa/phase9-common-mobile.png, qa/phase9-landscape.png, qa/phase9-tablet.png, qa/phase9-desktop.png, qa/phase9-after-resize.png.

INPUT (smoke9c), ALL PASSED:
- Touch joystick on an emulated Android device: drag produced full movement velocity (230) and displaced the player +58 x with no drift.
- Mouse tap-to-move: clicking east of the player moved him +41 x toward the tap.
- Keyboard covered in the regression run.

PERFORMANCE (smoke9d, perf-menu):
- Load: 1.75s from navigation to canvas in the sandbox (includes the unreachable YouTube SDK script failing; a served-local measurement, not a device measurement).
- Full-load stress (South Field unlocked, 200 crops, 3 customers, animals active): 360 display objects, 74 generated textures, JS heap 28.0 MB at start and 25.3 MB after 15 seconds of stress, so no leak growth; garbage collection reclaims steadily.
- Frame rate in headless Chrome (software renderer, throttled): 16 FPS average under full load, 27 to 37 FPS on the near-empty menu in the same environment. The environment itself caps well below 60, so these numbers prove the game's relative cost is modest (about half the software-render frame budget at maximum content) and cannot certify real-device frame rate. On hardware, 360 simple sprites is a light load for Phaser. A real-device check remains a Phase 10 playtest item.
- Bundle: 1.55 MB JavaScript raw, 358 KB gzipped, almost entirely Phaser. Appropriate for the platform.
- Allocation audit: movement allocates only on tap (not per frame); per-frame work is arithmetic on existing objects; effects (texts, bursts, coins) are created per event in single digits and destroyed on completion. No pooling was added because event counts do not justify it; NPC counts are capped by design (3 customers, 5 animals, 6 eggs, 4 milk).

KNOWN LIMITATIONS (honest):
- Landscape phones get a small pillarboxed portrait view. The game is designed portrait-first for Playables; it remains fully playable, but a landscape layout is not offered.
- Real-device frame rate, touch feel and audio quality are not verified by any headless test and wait for the user's device playtest.
- The official Playables Test Suite checks remain outstanding from Phase 8 (access pending).

ACCEPTANCE CRITERIA:
- [x] No known release-blocking gameplay defects (the full loop regressed clean; the only failures during QA were test-script faults, identified and fixed as such).
- [x] Production build runs.
- [x] Core loop works from start to finish.
- [x] Responsive controls are usable (keyboard, mouse, touch all verified; viewports all fit).
- [x] Save data survives reload (Phase 8 verification).
- [x] QA report reflects actual test results, including the environment limits above.

## PHASE: 10, Production packaging and submission preparation
STATUS: Complete (package and materials ready; submission itself waits on programme access and a hosting decision, below)

IMPLEMENTED AND VERIFIED:
- Final production build via a new release mode (npm run build:release). The QA hooks (window.harvestLaneGame and window.harvestLaneAudio) are stripped from the release bundle only; the normal and preview builds keep them so QA verifies the same code that ships. Verified: the hook identifier appears 0 times in the release bundle.
- No console logging or debug overlays exist in the source (grep verified).
- HTML entry point verified in dist/index.html: the Playables SDK script sits in the document head, before the game bundle (the SDK script was moved from the body into the head this phase to make the required load order unambiguous), and asset paths are relative so the package works from any subpath.
- Packaged build launched from a plain static file server (not Vite): boots to the menu, enters gameplay, no failed requests, no console errors, and the autosave wrote a version 1 save to storage, all without any QA hooks present. Menu and gameplay screenshots: qa/phase10-menu.png, qa/phase10-game.png.
- Release ZIP: release/harvest-lane-playables.zip, 359 KB, containing index.html at the root and the single JS asset (1.55 MB raw, about 358 KB compressed). 
- Source archive: release/harvest-lane-source.zip with src, tests, the .qa browser scripts, configs, README, the master plan and these phase reports (node_modules excluded).
- Submission materials written:
  - docs/GAME_DESCRIPTION.md: short and long descriptions and an honest feature list (states plainly: no ads, no in-app purchases, single player).
  - docs/METADATA.md: title, genre, orientation, developer (Yash Dashrath, individual), contact, package facts, and content self-assessment notes for the rating questionnaire (no violence, gambling, substances, social features or user data beyond the save file; the final rating is the platform questionnaire's outcome, not this document's).
  - docs/PLATFORM_NOTES.md: what is validated standalone, what is implemented but pending real-environment validation, and the known limitations.
  - The Playables interest form draft (~/workspace/youtube-playables/submission-draft.md) was rewritten for Harvest Lane with a paste-ready field 8 description, superseding the River Farm and Sunny Acres drafts.
- Promotional assets composed from real release-build gameplay (no stock, nothing borrowed): release/thumbnail-1280x720.png (gameplay with title treatment) and release/icon-512x512.png (gameplay crop with wordmark). These are honest starter assets; final portal specs should be rechecked at submission time, since requirements can change.

NOT DONE, AND WHY:
- Programme access and eligibility: unchanged. The interest form is still unsubmitted; access remains Google's decision. Nothing here claims approval or publication.
- Public hosted link: field 6 of the form needs the game live at a public URL (no Drive or Dropbox). The release ZIP is ready to host. Recommended route: GitHub Pages from the user's connected GitHub account (fast, free, stable URL); itch.io is the alternative. This is an outward publishing step under the user's name, so it waits for his explicit choice rather than being done under the build instruction.
- Age-rating questionnaire: notes are prepared in METADATA.md; the questionnaire itself runs inside the portal once access exists.
- Official Playables Test Suite run: still pending access, as recorded in Phases 8 and 9.
- Page 1 how-heard placeholder on the saved form draft must be replaced with a true answer before submitting; flagged in the draft.

ACCEPTANCE CRITERIA (deliverables):
- [x] Complete playable HTML5 game.
- [x] Source code (archive, plus the working tree).
- [x] Original game assets (all art and audio generated in code).
- [x] Production build.
- [x] Release ZIP.
- [x] README and setup instructions (including the release build command).
- [x] Automated tests (29 unit tests, plus the browser QA scripts).
- [x] QA report (PHASE_REPORTS.md, Phases 1 to 10).
- [x] SDK integration notes (docs/PLATFORM_NOTES.md and the Phase 8 report).
- [x] Publishing checklist: the before-submitting list in the submission draft.
