# MASTER PLAN — Levels, Land, Seeds, Animals, Outfits, Hotel

Written 2026-11-01 from the master prompt Yash supplied the same night
(`harvest-lane-master-prompt`). Section 0 of that prompt requires this plan:
every system each feature touches, conflicts found, and the decisions taken
before coding. Build order follows the prompt (1 to 9), tests after each
section, one section shipped and verified at a time.

## Where things live today (surveyed 2026-11-01)

- XP and levels: `systems/ProgressionSystem.ts`, curve `round(40 * level^1.32)`,
  rewards +1 backpack per level (cap +10) and 2 gems per level. XP sources:
  harvest +1, collect +2, serve +5 (per serve event). Level badge + XP bar in
  `ui/HUD.ts`; level-up is a floating text only.
- Crops: `game/CropField3D.ts` + `data/CropData.ts`. Harvest starts a REGROW
  timer (corn 14s, carrot 18s). No seeds, no planting, no bare-soil state.
- Fields and world: `game/Layout.ts` (design px, world x = (px-540)/46),
  `three/World.ts` (fences, gates, colliders, ground). 200 plots in 4 fields.
- Economy: prices scattered across `data/UpgradeData.ts` (4 tracks x 3),
  constants in `main.ts` (helper 300, churn 400, South Field 150) and
  `systems/MarketSystem.ts` (wave bonus, corn-gem trade 9).
- Animals: `game/AnimalSystem3D.ts`, fixed counts (3 chickens, 2 cows),
  troughs FEED_MAX 20, 1 feed per product.
- Helper: `game/HelperAI.ts`, capacity 8, speed 5.0, harvest + stock only.
- Cosmetics: `data/SkinData.ts` (6 farmer recolors, 5 weather, 5 roads),
  applied by material recolor in `three/models.ts` (rig.mats) and `main.ts`.
- Saves: `systems/SaveSystem.ts`, SAVE_VERSION 1, all newer fields optional.
- Particles: `three/models.ts` Bursts (uncapped). Settings: SFX/music sliders
  only. No Reduce Motion setting.

## Conflicts and decisions

1. **XP curve changes** (prompt: `round(50 * 1.35^(level-1))`). ADOPTED, moved
   into the new `data/LevelData.ts`. Existing players keep their current LEVEL;
   XP into the level is clamped to the new requirement minus 1. Rewards already
   granted are never taken back.
2. **XP source values change** (harvest 1 to 2, serve +5/event to +3 per ITEM,
   mission and contract claims gain XP, churn +5). ADOPTED. Serve XP is counted
   per item in the completed order inside MarketSystem.serve.
3. **Level gates on things that are coin-only today** (South Field L3, churn
   L6, helper tier 2 L8). ADOPTED for new purchases only. Anything already
   owned stays owned after migration; the shop shows "Level N" on locked rows,
   never a silent grey button (prompt rule).
4. **Seed loop vs "first 5 minutes not harder"**. The player starts with a
   full seed bag (30 corn seeds) and 10 carrot seeds arrive with the South
   Field. First seed pack stays cheap. Fields start planted exactly as today,
   so the loop only bites after the first full harvest cycle.
5. **Land extension slots**. Existing fields are fully tiled, so "+8 plots in
   existing fields" becomes: each Land pack builds a new fenced strip of 8
   corn plots along the east edge (East Strips 1 to 6). The East Field at
   Level 7 is a full new field further east; the world ground and camera
   bounds extend east (X() is an offset formula, so design px beyond 1080
   work unchanged).
6. **Outfits vs existing skins**. Shirts extend the current farmer-outfit slot
   (an outfit shirt overrides its colours and adds a model trim). Hats, Shoes,
   Chains and Glasses are NEW attachment slots on the farmer rig, layered over
   any outfit. Weather and road skins are untouched. Preview uses a small
   dedicated renderer inside the Outfits tab (the in-world farmer is not
   hijacked).
7. **Price hikes vs existing players**. Upgrade levels, helper and churn
   already bought stay bought. Only future purchases use the new prices
   (upgrades x1.4 base, helper 450, churn 600, corn-gem trade 9 to 12).
8. **Simulator honesty**. Crop growth lives in the render-coupled
   CropField3D, so the simulator (`scripts/simulate.mjs`) drives the REAL
   data files and pure systems (progression, market prices, upgrades,
   missions) with a documented timing model for planting, growth and walking.
   It is a balance model, not the game binary; the report will say so.
9. **Hotel placement**. South-east grass beyond the bottom fence, visible
   from the stall, with a path spur. Locked state: desaturated materials,
   scaffold boxes, padlock sign (canvas texture like the farm sign).
10. **Save version**. Bump to 2 with migrateV1toV2 and tests, per prompt
    section 10. The v1 normalizer stays for the migration path.
11. **Panel-pause rule**. Existing panels do NOT pause the world today (the
    prompt assumes they do). Decision: keep the current behaviour (world runs
    while panels are open) except the level-up panel, which is non-blocking
    by design. Changing global pause behaviour is a bigger design change than
    this programme should smuggle in.
12. **Backpack capacity rewards**. Prompt: +1 per level to L20, then every 2
    levels. Current cap is +10 total. ADOPTED (cap becomes +20 by L30 under
    the new rule); UpgradeSystem backpack track unchanged.

## Build order and verification per section

1. Levels: LevelData.ts, ProgressionSystem rework, XP sources, +XP floats,
   level-up panel, roadmap panel, badge bounce, confetti via Bursts.
   Tests: curve, sources, gating table, level-up rewards.
2. Seeds: FarmSystem-side crop state machine gains bare/planted states in
   CropField3D, seed bag in BackpackSystem sibling (SeedBag in MarketSystem
   file? No: new systems/SeedSystem.ts), shop Seeds tab, HUD seed readout,
   anti-softlock trickle, helper planting at tier 2 (tier arrives in S1 data,
   behaviour lands here), plant objectives in missions/contracts/dailies.
   Tests: consumption, trickle softlock case, planting cooldown.
3. Land: shop Land tab, East Strips 1-6, East Field, unlock animation
   (simplified: banner + fence drop + banner, camera pan unless Reduce
   Motion). Tests: pack price scaling, level gates, plot counts.
4. Animals: Animals tab, hen tiers to 12, cow tiers to 8, pen fence growth,
   trough +5 per tier, spawn hop. Tests: price scaling, gates, feed math.
5. Economy: EconomyData.ts collects every price; hikes applied; simulator
   built here (prompt S7 pulled forward so S3/S4/S6 prices are verified, the
   formal before/after table is still reported at S7).
6. Outfits: OutfitData.ts (20+ items), attachments on the rig, Outfits tab
   with preview renderer, equip sparkle, chain sway in the animation tick.
   Tests: ownership, equip rules, no-stat-effect assertion.
7. Simulator report: before/after table against targets, assertions in the
   test suite with tolerances.
8. Hotel: landmark building, locked panel, L10 unlock animation, HotelData
   types (tracks, recipes) with tests only for the data model.
9. Standards woven through: Reduce Motion toggle (lands in S1 with the
   level-up effects), particle cap 150 (S1), audio cues per section,
   bundle size reported each release.
10. Save v2 migration lands WITH S1 (level fields) and grows per section;
    final full regression (plant to hotel) after S8.

## Honest limits

- Real-device FPS and audio audibility cannot be verified here; headless
  SwiftShader timings are not device timings.
- The full programme is several shipped updates, not one drop. Each section
  is built, tested, published and reported separately under Yash's standing
  Harvest Lane autonomy.
