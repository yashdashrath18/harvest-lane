import { describe, it, expect } from 'vitest';
import {
  SAVE_VERSION,
  parseSaveString,
  serializeSave,
  validateSave,
  type GameSave,
} from '../src/systems/SaveSystem';
import { MarketSystem } from '../src/systems/MarketSystem';
import { BackpackSystem } from '../src/systems/BackpackSystem';
import { UpgradeSystem } from '../src/systems/UpgradeSystem';
import { MissionSystem } from '../src/systems/MissionSystem';

function sampleSave(): GameSave {
  return {
    version: SAVE_VERSION,
    savedAt: 123456,
    coins: 240,
    gems: 3,
    pendingCash: 0,
    xp: 0,
    feed: { chicken: 6, cow: 6 },
    helperHired: false,
    churnOwned: false,
    stock: { corn: 5, egg: 2 },
    backpack: { corn: 4 },
    seeds: { corn: 12, carrot: 3 },
    landPacks: 2,
    eastUnlocked: false,
    animalTiers: { chicken: 3, cow: 1 },
    upgrades: { backpack: 1, boots: 2 },
    areaUnlocked: true,
    missions: { progress: { 'harvest-30': 30, 'serve-10': 4 }, claimed: ['harvest-30'] },
    player: { x: 300, y: 700 },
    audio: { musicVolume: 0.4, sfxVolume: 0.8 },
    cosmetics: {
      owned: ['classic', 'day', 'sand', 'hat-straw', 'shoe-brown', 'chain-none', 'glass-none', 'ocean', 'dusk', 'hat-cap', 'chain-gold'],
      farmer: 'ocean',
      weather: 'dusk',
      road: 'sand',
      hat: 'hat-cap',
      shoes: 'shoe-brown',
      chain: 'chain-gold',
      glasses: 'glass-none',
    },
  };
}

describe('SaveSystem validation', () => {
  it('migrates a v1 save to v2 with starter seeds and everything else intact', () => {
    const v1 = sampleSave() as unknown as Record<string, unknown>;
    v1.version = 1;
    delete v1.seeds;
    const migrated = validateSave(v1);
    expect(migrated).not.toBeNull();
    expect(migrated!.version).toBe(SAVE_VERSION);
    // South Field owned in the fixture: corn bag plus carrot starter.
    expect(migrated!.seeds).toEqual({ corn: 30, carrot: 10 });
    expect(migrated!.coins).toBe(240);
    expect(migrated!.cosmetics.farmer).toBe('ocean');
    const v1NoSouth = { ...v1, areaUnlocked: false };
    expect(validateSave(v1NoSouth)!.seeds).toEqual({ corn: 30 });
  });

  it('round-trips a full save through serialize and parse', () => {
    const save = sampleSave();
    const back = parseSaveString(serializeSave(save));
    expect(back).toEqual(save);
  });

  it('rejects garbage, wrong types and future versions without throwing', () => {
    expect(parseSaveString('not json')).toBeNull();
    expect(parseSaveString('')).toBeNull();
    expect(parseSaveString(null)).toBeNull();
    expect(validateSave(null)).toBeNull();
    expect(validateSave([1, 2, 3])).toBeNull();
    expect(validateSave({ version: 'one' })).toBeNull();
    expect(validateSave({ version: SAVE_VERSION + 1 })).toBeNull();
    expect(validateSave({ version: 0 })).toBeNull();
  });

  it('normalises dirty fields into safe values', () => {
    const dirty = {
      version: SAVE_VERSION,
      coins: -50,
      gems: 2.9,
      stock: { corn: 3.7, egg: -1, milk: 'lots' },
      backpack: { corn: 2 },
      upgrades: {},
      areaUnlocked: 'yes',
      missions: { progress: { 'harvest-30': 12 }, claimed: [42, 'serve-10'] },
      player: { x: 'left' },
      audio: { musicVolume: 7, sfxVolume: -2 },
    };
    const save = validateSave(dirty);
    expect(save).not.toBeNull();
    expect(save!.coins).toBe(0);
    expect(save!.gems).toBe(2);
    expect(save!.stock).toEqual({ corn: 3 });
    expect(save!.areaUnlocked).toBe(false);
    expect(save!.missions.claimed).toEqual(['serve-10']);
    expect(save!.player.x).toBe(540);
    expect(save!.audio.musicVolume).toBe(1);
    expect(save!.audio.sfxVolume).toBe(0);
  });
});

describe('system snapshot and restore', () => {
  it('market, backpack, upgrades and missions survive a round trip', () => {
    const save = sampleSave();

    const market = new MarketSystem();
    market.restore({ coins: save.coins, gems: save.gems, stock: save.stock });
    expect(market.snapshot()).toEqual({ coins: 240, gems: 3, stock: { corn: 5, egg: 2 }, pendingCash: 0 });

    const upgrades = new UpgradeSystem();
    upgrades.restore(save.upgrades);
    expect(upgrades.snapshot()).toEqual({ backpack: 1, boots: 2 });
    upgrades.restore({ backpack: 99, unknownTrack: 3 });
    expect(upgrades.level('backpack')).toBe(3); // clamped to max level
    expect(upgrades.snapshot()).toEqual({ backpack: 3 });

    const backpack = new BackpackSystem(16); // capacity from the restored upgrade
    backpack.restore(save.backpack);
    expect(backpack.snapshot()).toEqual({ corn: 4 });

    const missions = new MissionSystem();
    missions.restore(save.missions);
    // The fixture predates contracts and dailies, so the snapshot
    // gains their canonical fresh blocks on top of the fixture.
    const snap = missions.snapshot();
    expect(snap.progress).toEqual(save.missions.progress);
    expect(snap.claimed).toEqual(save.missions.claimed);
    expect(snap.contracts).toEqual({ seq: 0, rotation: 0, tiers: {}, active: [] });
    expect(snap.daily?.ids).toHaveLength(3);
    expect(missions.isClaimed('harvest-30')).toBe(true);
  });

  it('backpack restore respects capacity instead of overflowing', () => {
    const backpack = new BackpackSystem(10);
    backpack.restore({ corn: 25 });
    expect(backpack.total).toBe(10);
  });
});

describe('cosmetics in saves', () => {
  it('defaults cosmetics for saves written before skins existed', () => {
    const legacy = sampleSave() as unknown as Record<string, unknown>;
    delete legacy.cosmetics;
    const save = validateSave(legacy);
    expect(save!.cosmetics).toEqual({
      owned: ['classic', 'day', 'sand', 'hat-straw', 'shoe-brown', 'chain-none', 'glass-none'],
      farmer: 'classic',
      weather: 'day',
      road: 'sand',
      hat: 'hat-straw',
      shoes: 'shoe-brown',
      chain: 'chain-none',
      glasses: 'glass-none',
    });
  });

  it('drops unknown skin ids and unequips unowned or cross-category ids', () => {
    const dirty = sampleSave() as unknown as Record<string, unknown>;
    dirty.cosmetics = { owned: ['classic', 'day', 'sand', 'not-a-skin', 'golden'], farmer: 'golden', weather: 'golden', road: 'stone' };
    const save = validateSave(dirty);
    // 'not-a-skin' dropped; farmer 'golden' is owned so it stays;
    // weather 'golden' is a farmer skin, not weather, so it falls
    // back to 'day'; road 'stone' is not owned, so 'sand' returns.
    expect(save!.cosmetics.owned).not.toContain('not-a-skin');
    expect(save!.cosmetics.farmer).toBe('golden');
    expect(save!.cosmetics.weather).toBe('day');
    expect(save!.cosmetics.road).toBe('sand');
  });
});
