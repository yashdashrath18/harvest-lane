import { describe, expect, it } from 'vitest';
import { MarketSystem } from '../src/systems/MarketSystem';
import { MissionSystem } from '../src/systems/MissionSystem';

describe('MissionSystem', () => {
  it('tracks matching events and ignores other items', () => {
    const missions = new MissionSystem();
    missions.track('harvest', 'corn', 12);
    missions.track('harvest', 'carrot', 50);
    expect(missions.progressOf('harvest-30')).toBe(12);
    expect(missions.progressOf('harvest-120')).toBe(12);
  });

  it('completes at the target and claims the coin reward once', () => {
    const missions = new MissionSystem();
    const market = new MarketSystem();
    missions.track('harvest', 'corn', 30);
    expect(missions.hasClaimable()).toBe(true);
    expect(missions.claim('harvest-30', market)).toBe(true);
    expect(market.coins).toBe(40);
    expect(missions.claim('harvest-30', market)).toBe(false);
    expect(market.coins).toBe(40);
  });

  it('refuses to claim an incomplete mission', () => {
    const missions = new MissionSystem();
    const market = new MarketSystem();
    missions.track('serve', undefined, 3);
    expect(missions.claim('serve-10', market)).toBe(false);
    expect(market.gems).toBe(0);
  });

  it('pays gem rewards for the serve mission', () => {
    const missions = new MissionSystem();
    const market = new MarketSystem();
    missions.track('serve', undefined, 10);
    expect(missions.claim('serve-10', market)).toBe(true);
    expect(market.gems).toBe(3);
  });
});

describe('MissionSystem endless contracts', () => {
  /** Drives a fresh system to the moment the contract board unlocks. */
  function unlockedSystem() {
    const missions = new MissionSystem();
    const market = new MarketSystem();
    missions.track('harvest', 'corn', 120);
    missions.track('sell', 'corn', 25);
    missions.track('serve', undefined, 10);
    missions.track('collect', 'egg', 20);
    missions.track('area', undefined, 1);
    for (const id of ['harvest-30', 'sell-25', 'serve-10', 'eggs-20', 'harvest-120', 'area-1']) {
      expect(missions.claim(id, market)).toBe(true);
    }
    return { missions, market };
  }

  it('stay locked until every base mission is claimed', () => {
    const missions = new MissionSystem();
    missions.track('harvest', 'corn', 500);
    expect(missions.contractsUnlocked).toBe(false);
    expect(missions.activeContractCount).toBe(0);
    expect(missions.describe()).toHaveLength(6);
  });

  it('unlock with three contracts in template rotation', () => {
    const { missions } = unlockedSystem();
    expect(missions.contractsUnlocked).toBe(true);
    expect(missions.activeContractCount).toBe(3);
    const rows = missions.describe();
    expect(rows).toHaveLength(9);
    const contracts = rows.slice(6);
    expect(contracts[0].title).toBe('Contract: Harvest 60 corn');
    expect(contracts[0].target).toBe(60);
    expect(contracts[0].rewardText).toBe('60 coins');
    expect(contracts[1].title).toBe('Contract: Sell 40 corn');
    expect(contracts[2].title).toBe('Contract: Serve 15 customers');
  });

  it('count only events tracked after they were issued', () => {
    const { missions } = unlockedSystem();
    // The 120 corn harvested before unlock must not pre-fill the contract.
    const row = missions.describe()[6];
    expect(row.progress).toBe(0);
    missions.track('harvest', 'corn', 25);
    expect(missions.describe()[6].progress).toBe(25);
    // Other items do not count.
    missions.track('harvest', 'carrot', 40);
    expect(missions.describe()[6].progress).toBe(25);
  });

  it('claiming a contract pays out and deals a replacement', () => {
    const { missions, market } = unlockedSystem();
    const first = missions.describe()[6];
    missions.track('harvest', 'corn', first.target);
    const coinsBefore = market.coins;
    expect(missions.claim(first.id, market)).toBe(true);
    expect(market.coins).toBe(coinsBefore + 60);
    expect(missions.activeContractCount).toBe(3);
    const titles = missions.describe().slice(6).map((r) => r.title);
    expect(titles).toContain('Contract: Collect 30 eggs');
    expect(titles).not.toContain('Contract: Harvest 60 corn');
  });

  it('raises a template target by its growth factor on its next tier', () => {
    const { missions, market } = unlockedSystem();
    // Clear the whole first rotation, then the next harvest-corn
    // contract (tier 1) must ask for 90 instead of 60.
    for (let round = 0; round < 6; round++) {
      const row = missions.describe().slice(6).find((r) => !r.complete);
      if (!row) break;
      const [kind, item] =
        row.title.includes('Harvest') && row.title.includes('corn')
          ? ['harvest', 'corn']
          : row.title.includes('Sell')
            ? ['sell', 'corn']
            : row.title.includes('Serve')
              ? ['serve', undefined]
              : row.title.includes('eggs')
                ? ['collect', 'egg']
                : row.title.includes('milk')
                  ? ['collect', 'milk']
                  : ['harvest', 'carrot'];
      missions.track(kind as never, item as never, row.target);
      expect(missions.claim(row.id, market)).toBe(true);
    }
    const cornRow = missions.describe().slice(6).find((r) => r.title.includes('Harvest') && r.title.includes('corn'));
    expect(cornRow?.title).toBe('Contract: Harvest 90 corn');
  });

  it('pays bonus gems on every third serve tier', () => {
    const { missions } = unlockedSystem();
    const snapshot = missions.snapshot();
    // Force the board to a tier-2 serve contract through restore.
    snapshot.contracts!.active = [
      { uid: 'contract-serve-any-99', templateKey: 'serve', tier: 2, target: 34, rewardCoins: 204, rewardGems: 3 },
    ];
    snapshot.progress['contract-serve-any-99'] = 34;
    const restored = new MissionSystem();
    restored.restore(snapshot);
    const row = restored.describe().find((r) => r.id === 'contract-serve-any-99');
    expect(row?.rewardText).toBe('204 coins + 3 gems');
    expect(row?.complete).toBe(true);
  });

  it('survive a snapshot and restore round trip', () => {
    const { missions } = unlockedSystem();
    const first = missions.describe()[6];
    missions.track('harvest', 'corn', 17);
    const restored = new MissionSystem();
    restored.restore(missions.snapshot());
    expect(restored.contractsUnlocked).toBe(true);
    expect(restored.activeContractCount).toBe(3);
    const row = restored.describe().find((r) => r.id === first.id);
    expect(row?.progress).toBe(17);
    expect(row?.target).toBe(first.target);
  });

  it('daily missions: three today, tracked like missions, claim pays once', () => {
    const missions = new MissionSystem();
    const market = new MarketSystem();
    const rows = missions.describeDaily();
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.id)).size).toBe(3);
    // Drive whichever dailies exist to completion via their own kinds.
    for (const row of rows) {
      const def = row.id;
      if (def.includes('harvest-corn')) missions.track('harvest', 'corn', row.target);
      else if (def.includes('serve')) missions.track('serve', undefined, row.target);
      else if (def.includes('eggs')) missions.track('collect', 'egg', row.target);
      else if (def.includes('sell-corn')) missions.track('sell', 'corn', row.target);
      else if (def.includes('milk')) missions.track('collect', 'milk', row.target);
      else if (def.includes('carrots')) missions.track('harvest', 'carrot', row.target);
    }
    const after = missions.describeDaily();
    expect(after.every((r) => r.complete)).toBe(true);
    expect(missions.hasClaimable()).toBe(true);
    const coinsBefore = market.coins;
    const gemsBefore = market.gems;
    for (const row of after) expect(missions.claim(row.id, market)).toBe(true);
    expect(market.coins + market.gems).toBeGreaterThan(coinsBefore + gemsBefore);
    for (const row of after) expect(missions.claim(row.id, market)).toBe(false);
    expect(missions.describeDaily().every((r) => r.claimed)).toBe(true);
  });

  it('daily state survives a snapshot round trip', () => {
    const missions = new MissionSystem();
    missions.track('serve', undefined, 3);
    const restored = new MissionSystem();
    restored.restore(missions.snapshot());
    expect(restored.describeDaily().map((r) => r.id)).toEqual(missions.describeDaily().map((r) => r.id));
    expect(restored.describeDaily().map((r) => r.progress)).toEqual(missions.describeDaily().map((r) => r.progress));
  });

  it('old saves without a contracts block restore and unlock fresh', () => {
    const { missions } = unlockedSystem();
    const snapshot = missions.snapshot();
    delete snapshot.contracts;
    const restored = new MissionSystem();
    restored.restore(snapshot);
    expect(restored.contractsUnlocked).toBe(true);
    expect(restored.activeContractCount).toBe(3);
    expect(restored.describe()[6].title).toBe('Contract: Harvest 60 corn');
    expect(restored.describe()[6].progress).toBe(0);
  });
});
