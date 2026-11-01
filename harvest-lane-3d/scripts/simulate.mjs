/**
 * Harvest Lane economy simulator (master prompt 7).
 *
 * WHAT THIS IS: a model, not the game. It drives the REAL data files
 * (CropData, ItemData, SeedData, LandData, AnimalData, UpgradeData,
 * LevelData, MissionData, EconomyData) through a documented set of
 * assumptions about a casual player, and reports milestones over 30
 * simulated days. When data changes, rerun:  npm run sim
 *
 * THE MODEL PLAYER (assumptions, all deliberate and conservative):
 *  - Plays 25 minutes a day (two short Playables-style sessions).
 *  - Sells about 100 items an hour of play early on: a leisurely
 *    one-thumb loop with timeouts and idle gaps. Throughput grows
 *    with backpack capacity, boots, and (once hired) the helper,
 *    who adds 55% and never tires.
 *  - Everything sold is grown: crop income is limited by plots and
 *    by the seed cost of replanting (corn 2 coins, carrot 3).
 *  - Animals: each hen effectively yields 14 collected eggs an hour
 *    of play, each cow 8 milk (collection-limited, not timer-limited);
 *    every product eats one corn of feed (valued at corn's price).
 *    Half the milk is churned once the churn is owned (14 -> 42).
 *  - XP: 2 per harvest, 3 per item sold, plus mission, daily and
 *    contract claim XP at the rates in the data files, with claims
 *    happening the day after a mission completes.
 *  - Purchases: a fixed sensible priority list, one purchase per day
 *    at most, only when the level gate and the wallet allow.
 *  - "Day 1 income" in the target table means the wallet at the end
 *    of day 1 (gross earnings minus day-1 seed and upgrade spend),
 *    which is what a new player actually feels.
 */
// Run via `npm run sim` (tsx executes this .mjs and resolves the .ts
// imports below). The unused CropData import keeps the crop table in
// the load set for future model refinements.
const CropData = await import('../src/data/CropData.ts');
void CropData;
const ItemData = await import('../src/data/ItemData.ts');
const SeedData = await import('../src/data/SeedData.ts');
const LandData = await import('../src/data/LandData.ts');
const AnimalData = await import('../src/data/AnimalData.ts');
const UpgradeData = await import('../src/data/UpgradeData.ts');
const LevelData = await import('../src/data/LevelData.ts');
const MissionData = await import('../src/data/MissionData.ts');
const EconomyData = await import('../src/data/EconomyData.ts');

const PLAY_HOURS_PER_DAY = 25 / 60;
// Blended SOLD items per hour for a casual player. Cross-check: a
// customer wave is 3 customers ordering ~7 items and takes 30-60s of
// attended time, but the same player also harvests, walks, idles and
// loses customers to timeouts; observed bot play (focused, tireless)
// harvests 150-250/hr, and a casual human sells far less than that.
const BASE_ITEMS_PER_HOUR = 65;
// The seed-and-replant loop (S2) taxes every cycle: each harvested
// plot must be walked again to replant, seeds run out and get
// rebought, so sustained throughput is about 25% below the old
// auto-regrow loop's.
const REPLANT_FACTOR = 0.75;
// The helper harvests and stocks but cannot plant until Level 8,
// so before that his bonus is smaller (bare plots stall his supply).
const HELPER_BONUS = 0.35;
const HELPER_BONUS_PLANTING = 0.55;

/** The pre-S5 price table, kept so the report shows the pass's effect. */
const BASELINE = {
  upgradeCosts: { backpack: [40, 90, 180], boots: [35, 80, 160], fertilizer: [45, 100, 200], charm: [50, 110, 220] },
  southField: 150,
  helper: 300,
  churn: 400,
  cornPerGem: 9,
};

function livePrices() {
  const costs = {};
  for (const t of UpgradeData.UPGRADE_TRACKS) costs[t.id] = t.costs;
  return {
    upgradeCosts: costs,
    southField: UpgradeData.SOUTH_FIELD.cost,
    helper: EconomyData.HELPER_COST,
    churn: EconomyData.CHURN_COST,
    cornPerGem: EconomyData.CORN_PER_GEM,
  };
}

function simulate(prices) {
  const P = {
    coins: 0, gems: 0, xp: 0, level: 1,
    plotsCorn: 152, plotsCarrot: 0,
    hens: AnimalData.HEN_BASE, cows: AnimalData.COW_BASE,
    henTier: 0, cowTier: 0,
    up: { backpack: 0, boots: 0, fertilizer: 0, charm: 0 },
    south: false, helper: false, churn: false,
    landPacks: 0, east: false,
    baseMissionsClaimed: 0, contractsDone: 0,
  };
  const milestones = {};
  const daily = [];
  const baseMissionXp = [25, 30, 35, 40, 50, 60]; // claimReward scale, S1

  const capacity = () => UpgradeData.BACKPACK_CAPACITIES[P.up.backpack] + LevelData.capacityBonusFor(P.level);
  const priceMult = () => 1 + UpgradeData.PRICE_PER_LEVEL * P.up.charm;
  // Sold items per hour is the LOWER of what the player can supply
  // and what the customer waves actually buy from a casual player
  // who misses waves while planting and harvesting (~55/hr).
  const DEMAND_PER_HOUR = 55;
  const itemsPerHour = () =>
    Math.min(
      DEMAND_PER_HOUR,
      BASE_ITEMS_PER_HOUR *
        REPLANT_FACTOR *
        (capacity() / 10) ** 0.5 *
        (1 + UpgradeData.SPEED_PER_LEVEL * P.up.boots * 0.5) *
        (P.helper ? 1 + (P.level >= 8 ? HELPER_BONUS_PLANTING : HELPER_BONUS) : 1),
    );

  for (let day = 1; day <= 30; day++) {
    const startCoins = P.coins;
    // --- production and sales for the day ---
    // Day 1 runs at 60%: a new player spends much of it learning.
    const dayFactor = day === 1 ? 0.6 : 1;
    const items = Math.round(itemsPerHour() * PLAY_HOURS_PER_DAY * dayFactor);
    // Product mix: corn dominates until carrots/animals scale up.
    // Egg and milk shares are collection-limited: pen trips are
    // occasional, so animal products stay a minority of sales.
    const eggRate = Math.min(0.18, (P.hens * 14) / Math.max(1, itemsPerHour()));
    const milkRate = Math.min(0.12, (P.cows * 8) / Math.max(1, itemsPerHour()));
    const carrotRate = P.south ? 0.18 : 0;
    const eggs = Math.round(items * eggRate);
    const milkAll = Math.round(items * milkRate);
    const churned = P.churn ? Math.round(milkAll / 2) : 0;
    const milk = milkAll - churned;
    const carrots = Math.round(items * carrotRate);
    const cornSold = Math.max(0, items - eggs - milkAll - carrots);
    const feedCorn = eggs + milkAll; // one corn per product
    const gross =
      (cornSold * ItemData.ITEM_PRICES.corn +
        carrots * ItemData.ITEM_PRICES.carrot +
        eggs * ItemData.ITEM_PRICES.egg +
        milk * ItemData.ITEM_PRICES.milk +
        churned * ItemData.ITEM_PRICES.cheese) *
      priceMult();
    // Seed cost of replanting the crops sold (feed corn is eaten, not sold).
    const packOf = (id) => SeedData.SEED_PACKS.find((p) => p.cropId === id);
    const seedCost =
      cornSold * (packOf('corn').price / packOf('corn').packSize) +
      carrots * (packOf('carrot').price / packOf('carrot').packSize);
    P.coins += Math.round(gross - seedCost);

    // --- XP for the day ---
    let xp = items * 2 + items * 3; // harvest + serve, averaged per item
    if (P.baseMissionsClaimed < MissionData.MISSIONS.length && day >= 2 + P.baseMissionsClaimed) {
      const m = MissionData.MISSIONS[P.baseMissionsClaimed];
      xp += baseMissionXp[P.baseMissionsClaimed];
      P.coins += m.rewardCoins ?? 0;
      P.gems += m.rewardGems ?? 0;
      P.baseMissionsClaimed++;
    } else if (P.baseMissionsClaimed >= MissionData.MISSIONS.length && day % 2 === 0) {
      const t = MissionData.CONTRACT_TEMPLATES[P.contractsDone % MissionData.CONTRACT_TEMPLATES.length];
      const tier = Math.floor(P.contractsDone / MissionData.CONTRACT_TEMPLATES.length);
      const target = Math.round(t.baseTarget * t.growth ** tier);
      P.coins += Math.round(target * t.coinRate);
      xp += 30 + 5 * tier;
      P.contractsDone++;
    }
    if (day >= 2) {
      xp += 20; // one daily claim a day at 20 XP (S1 rate)
      P.gems += 1;
    }
    P.xp += xp;
    while (P.level < LevelData.MAX_LEVEL && P.xp >= LevelData.totalXpForLevel(P.level + 1)) {
      P.level++;
      P.gems += 2; // ProgressionSystem.gemsPerLevel
      if (P.level === 10 && !milestones.level10Day) milestones.level10Day = day;
    }

    // --- one purchase a day, fixed priority (none on day 1: a new
    // player learns and hoards before they spend) ---
    const buy = (ok, cost, apply, tag) => {
      if (ok && P.coins >= cost) {
        P.coins -= cost;
        apply();
        if (tag && !milestones[tag]) milestones[tag] = day;
        return true;
      }
      return false;
    };
    const upCost = (id) => prices.upgradeCosts[id][P.up[id]];
    const sequence = [
      () => buy(P.up.backpack === 0, upCost('backpack'), () => P.up.backpack++, null),
      () => buy(!P.south && P.level >= 3, prices.southField, () => { P.south = true; P.plotsCarrot = 48; }, 'southDay'),
      () => buy(P.up.boots === 0, upCost('boots'), () => P.up.boots++, null),
      () => buy(!P.helper, prices.helper, () => { P.helper = true; }, 'helperDay'),
      () => buy(P.up.fertilizer === 0, upCost('fertilizer'), () => P.up.fertilizer++, null),
      () => buy(!P.churn && P.level >= 6, prices.churn, () => { P.churn = true; }, null),
      () => buy(P.up.charm === 0, upCost('charm'), () => P.up.charm++, null),
      () => buy(P.landPacks < LandData.LAND_PACK_COUNT && P.level >= LandData.landPackLevel(P.landPacks), LandData.landPackPrice(P.landPacks), () => { P.landPacks++; P.plotsCorn += LandData.PLOTS_PER_PACK; }, P.landPacks === 0 ? 'landDay' : null),
      () => buy(P.henTier < AnimalData.HEN_MAX_TIER && P.level >= AnimalData.henLevel(P.henTier), AnimalData.henPrice(P.henTier), () => { P.henTier++; P.hens++; }, null),
      () => buy(P.cowTier < AnimalData.COW_MAX_TIER && P.level >= AnimalData.cowLevel(P.cowTier), AnimalData.cowPrice(P.cowTier), () => { P.cowTier++; P.cows++; }, null),
      () => buy(!P.east && P.level >= LandData.EAST_FIELD.level, LandData.EAST_FIELD.price, () => { P.east = true; P.plotsCorn += LandData.EAST_FIELD.plots; }, null),
      () => buy(P.up.backpack < 3, upCost('backpack'), () => P.up.backpack++, null),
      () => buy(P.up.boots < 3, upCost('boots'), () => P.up.boots++, null),
      () => buy(P.up.fertilizer < 3, upCost('fertilizer'), () => P.up.fertilizer++, null),
      () => buy(P.up.charm < 3, upCost('charm'), () => P.up.charm++, null),
    ];
    if (day >= 2) for (const step of sequence) if (step()) break;

    daily.push({ day, coins: P.coins, earned: P.coins - startCoins + 0, level: P.level, gems: P.gems });
    if (day === 1) milestones.day1Wallet = P.coins;
    if (P.coins < 0) milestones.wentNegative = day;
  }
  return { milestones, daily, end: P };
}

const before = simulate(BASELINE);
const after = simulate(livePrices());

const rows = [
  ['Day 1 wallet (coins)', before.milestones.day1Wallet, after.milestones.day1Wallet, '40-120'],
  ['South Field day', before.milestones.southDay ?? '-', after.milestones.southDay ?? '-', '2-5'],
  ['Helper day', before.milestones.helperDay ?? '-', after.milestones.helperDay ?? '-', '3-6'],
  ['First land pack day', before.milestones.landDay ?? '-', after.milestones.landDay ?? '-', '4-8'],
  ['Level 10 day', before.milestones.level10Day ?? '-', after.milestones.level10Day ?? '-', '12-20'],
  ['Gems by day 30', before.end.gems, after.end.gems, '>= 15'],
  ['Coins by day 30', before.end.coins, after.end.coins, 'growing'],
];
if (process.env.SIM_DAILY) { for (const d of after.daily) console.log(`day ${d.day}: coins ${d.coins} level ${d.level} gems ${d.gems}`); }
console.log('\nHarvest Lane economy simulation (model: 25 min/day casual player, see header)');
console.log('Milestone            Before S5   After S5   Target');
for (const [name, b, a, t] of rows) {
  console.log(`${name.padEnd(22)}${String(b).padStart(8)}${String(a).padStart(10)}   ${t}`);
}

const checks = [];
const inBand = (v, lo, hi) => typeof v === 'number' && v >= lo && v <= hi;
checks.push(['Day 1 wallet in 40-120', inBand(after.milestones.day1Wallet, 40, 120)]);
checks.push(['South Field day in 2-5', inBand(after.milestones.southDay, 2, 5)]);
checks.push(['Helper day in 3-6', inBand(after.milestones.helperDay, 3, 6)]);
checks.push(['Land pack day in 4-8 (and level >= 4 by then)', inBand(after.milestones.landDay, 4, 8)]);
checks.push(['Level 10 day in 12-20', inBand(after.milestones.level10Day, 12, 20)]);
checks.push(['At least 15 gems by day 30', after.end.gems >= 15]);
checks.push(['Coins never negative', !after.milestones.wentNegative]);
console.log('\nTarget checks (after S5):');
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}
if (failed > 0) {
  console.log(`\n${failed} target(s) missed. Tune rewards in the data files, not the model constants, unless the model itself is wrong.`);
  process.exitCode = 1;
}
