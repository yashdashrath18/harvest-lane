/**
 * The versioned game save. One schema, used identically for the
 * standalone localStorage save and the YouTube Playables cloud save
 * (which travels as a JSON string through ytgame.game.saveData).
 *
 * Rules that keep saves safe:
 * - validateSave never throws. Missing, malformed, or future-version
 *   data returns null and the game starts fresh rather than crashing.
 * - Migration is a chain: when version 2 exists, a step upgrades a
 *   version 1 object to 2 here, so old saves keep working.
 * - A corrupt local payload is backed up under a separate key before
 *   being discarded, so the evidence survives for debugging.
 */

import { allSkinIds, FARMER_SKINS, WEATHER_SKINS, ROAD_SKINS } from '../data/SkinData';
import { allOutfitIds, DEFAULT_OUTFIT, outfitItem, type OutfitCategory } from '../data/OutfitData';

export const SAVE_VERSION = 2;
const SAVE_KEY = 'harvest-lane-save:game-save';
const BACKUP_KEY = 'harvest-lane-save:game-save-corrupt-backup';
export const SAVE_SIZE_LIMIT = 3 * 1024 * 1024; // Playables saveData cap

export interface GameSave {
  version: number;
  savedAt: number;
  coins: number;
  gems: number;
  /** Uncollected cash sitting on the stall's cash pile. */
  pendingCash: number;
  /** Lifetime XP total; the farm level derives from it. */
  xp: number;
  /** Feed stocked in each pen's trough. */
  feed: { chicken: number; cow: number };
  helperHired: boolean;
  churnOwned: boolean;
  stock: Record<string, number>;
  backpack: Record<string, number>;
  /** Seeds held in the seed bag, by crop id (save v2, master prompt S2). */
  seeds: Record<string, number>;
  /** East Strip packs owned, 0..6 (master prompt S3). */
  landPacks: number;
  /** The East Field bought (master prompt S3). */
  eastUnlocked: boolean;
  /** Animal extension tiers owned (master prompt S4). */
  animalTiers: { chicken: number; cow: number };
  upgrades: Record<string, number>;
  areaUnlocked: boolean;
  missions: {
    progress: Record<string, number>;
    claimed: string[];
    daily?: {
      date: string;
      ids: string[];
      progress: Record<string, number>;
      claimed: string[];
    };
    contracts?: {
      seq: number;
      rotation: number;
      tiers: Record<string, number>;
      active: Array<{
        uid: string;
        templateKey: string;
        tier: number;
        target: number;
        rewardCoins: number;
        rewardGems: number;
      }>;
    };
  };
  player: { x: number; y: number };
  audio: { musicVolume: number; sfxVolume: number };
  /** Owned and equipped cosmetics (shop Skins tab). */
  cosmetics: {
    owned: string[];
    farmer: string;
    weather: string;
    road: string;
    hat: string;
    shoes: string;
    chain: string;
    glasses: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberRecord(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isRecord(value)) return out;
  Object.entries(value).forEach(([key, v]) => {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[key] = Math.floor(v);
  });
  return out;
}

function cleanInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Sanitises the endless-contracts block of a missions save; the MissionSystem revalidates ids and templates on restore. */
function cleanContracts(value: unknown): GameSave['missions']['contracts'] {
  if (!isRecord(value)) return undefined;
  const active: NonNullable<GameSave['missions']['contracts']>['active'] = [];
  if (Array.isArray(value.active)) {
    value.active.forEach((entry) => {
      if (!isRecord(entry)) return;
      if (typeof entry.uid !== 'string' || typeof entry.templateKey !== 'string') return;
      active.push({
        uid: entry.uid,
        templateKey: entry.templateKey,
        tier: cleanInt(entry.tier),
        target: Math.max(1, cleanInt(entry.target)),
        rewardCoins: cleanInt(entry.rewardCoins),
        rewardGems: cleanInt(entry.rewardGems),
      });
    });
  }
  return {
    seq: cleanInt(value.seq),
    rotation: cleanInt(value.rotation),
    tiers: numberRecord(value.tiers),
    active,
  };
}

function cleanVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

/** Trough feed levels, clamped to the largest possible trough (65 at max tier). Saves written before feeding existed start with a half-full trough. */
function cleanFeed(value: unknown): GameSave['feed'] {
  if (!isRecord(value)) return { chicken: 6, cow: 6 };
  const clamp = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(65, Math.max(0, Math.floor(v))) : 0;
  return { chicken: clamp(value.chicken), cow: clamp(value.cow) };
}

/** Animal extension tiers (master prompt S4), clamped to the data caps. */
function cleanAnimalTiers(value: unknown): GameSave['animalTiers'] {
  if (!isRecord(value)) return { chicken: 0, cow: 0 };
  const clamp = (v: unknown, max: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0;
  return { chicken: clamp(value.chicken, 9), cow: clamp(value.cow, 6) };
}

/** Sanitises the cosmetics block against the SkinData catalogue: unknown ids drop out, the three free defaults are always owned, and each equipped slot falls back to its default when invalid or unowned. */
function cleanCosmetics(value: unknown): GameSave['cosmetics'] {
  const raw = isRecord(value) ? value : {};
  const valid = new Set([...allSkinIds(), ...allOutfitIds()]);
  const owned = new Set<string>(['classic', 'day', 'sand', 'hat-straw', 'shoe-brown', 'chain-none', 'glass-none']);
  if (Array.isArray(raw.owned)) {
    for (const id of raw.owned) {
      if (typeof id === 'string' && valid.has(id)) owned.add(id);
    }
  }
  const pick = (v: unknown, fallback: string, ok: (id: string) => boolean): string =>
    typeof v === 'string' && ok(v) && owned.has(v) ? v : fallback;
  const inCategory = (cat: string) => (id: string) =>
    id === DEFAULT_OUTFIT[cat as OutfitCategory] || outfitItem(id)?.category === cat;
  return {
    owned: [...owned],
    farmer: pick(raw.farmer, 'classic', (id) => FARMER_SKINS.some((s) => s.id === id)),
    weather: pick(raw.weather, 'day', (id) => WEATHER_SKINS.some((s) => s.id === id)),
    road: pick(raw.road, 'sand', (id) => ROAD_SKINS.some((s) => s.id === id)),
    hat: pick(raw.hat, 'hat-straw', inCategory('hat')),
    shoes: pick(raw.shoes, 'shoe-brown', inCategory('shoes')),
    chain: pick(raw.chain, 'chain-none', inCategory('chain')),
    glasses: pick(raw.glasses, 'glass-none', inCategory('glasses')),
  };
}

/** Sanitises the daily-missions block; the MissionSystem revalidates ids and regenerates when the date has rolled over. */
function cleanDaily(value: unknown): GameSave['missions']['daily'] {
  if (!isRecord(value)) return undefined;
  if (typeof value.date !== 'string' || !/^\d{4}-\d{1,2}-\d{1,2}$/.test(value.date)) return undefined;
  const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string') : [];
  return {
    date: value.date,
    ids: strings(value.ids),
    progress: numberRecord(value.progress),
    claimed: strings(value.claimed),
  };
}

/**
 * Normalises a parsed save object of the current version. Unknown
 * fields are dropped, bad numbers become safe defaults, and item or
 * mission ids are validated later by the systems that own them.
 */
function normalizeV1(raw: Record<string, unknown>): GameSave {
  const missionsRaw = isRecord(raw.missions) ? raw.missions : {};
  const playerRaw = isRecord(raw.player) ? raw.player : {};
  const audioRaw = isRecord(raw.audio) ? raw.audio : {};
  return {
    version: SAVE_VERSION,
    savedAt: typeof raw.savedAt === 'number' && Number.isFinite(raw.savedAt) ? raw.savedAt : 0,
    coins: cleanInt(raw.coins),
    gems: cleanInt(raw.gems),
    pendingCash: cleanInt(raw.pendingCash),
    xp: cleanInt(raw.xp),
    feed: cleanFeed(raw.feed),
    helperHired: raw.helperHired === true,
    churnOwned: raw.churnOwned === true,
    stock: numberRecord(raw.stock),
    backpack: numberRecord(raw.backpack),
    seeds: numberRecord(raw.seeds),
    landPacks: Math.min(6, cleanInt(raw.landPacks)),
    eastUnlocked: raw.eastUnlocked === true,
    animalTiers: cleanAnimalTiers(raw.animalTiers),
    upgrades: numberRecord(raw.upgrades),
    areaUnlocked: raw.areaUnlocked === true,
    missions: {
      progress: numberRecord(missionsRaw.progress),
      claimed: Array.isArray(missionsRaw.claimed)
        ? missionsRaw.claimed.filter((id): id is string => typeof id === 'string')
        : [],
      daily: cleanDaily(missionsRaw.daily),
      contracts: cleanContracts(missionsRaw.contracts),
    },
    player: {
      x: typeof playerRaw.x === 'number' && Number.isFinite(playerRaw.x) ? playerRaw.x : 540,
      y: typeof playerRaw.y === 'number' && Number.isFinite(playerRaw.y) ? playerRaw.y : 910,
    },
    audio: {
      musicVolume: cleanVolume(audioRaw.musicVolume, 0.7),
      sfxVolume: cleanVolume(audioRaw.sfxVolume, 0.9),
    },
    cosmetics: cleanCosmetics(raw.cosmetics),
  };
}

/**
 * Validates (and migrates) an unknown parsed value into a GameSave,
 * or returns null when it cannot be trusted.
 */
export function validateSave(raw: unknown): GameSave | null {
  if (!isRecord(raw)) return null;
  const version = raw.version;
  if (typeof version !== 'number' || !Number.isInteger(version)) return null;
  if (version > SAVE_VERSION) return null; // written by a newer game
  if (version === SAVE_VERSION) return normalizeV1(raw);
  if (version === 1) {
    // v1 to v2 (master prompt S2): the seed bag is new. Migrated
    // players start with a full bag of corn seeds, plus carrot seeds
    // when they already own the South Field, so the replant loop
    // never opens as a wall. Everything else carries over untouched.
    const save = normalizeV1(raw);
    save.seeds = save.areaUnlocked ? { corn: 30, carrot: 10 } : { corn: 30 };
    return save;
  }
  return null;
}

/** Parses a serialized save (the cloud format). Never throws. */
export function parseSaveString(serialized: string | null | undefined): GameSave | null {
  if (!serialized) return null;
  try {
    return validateSave(JSON.parse(serialized));
  } catch {
    return null;
  }
}

/** Serializes a save for either backend, respecting the size cap. */
export function serializeSave(save: GameSave): string {
  const serialized = JSON.stringify(save);
  return serialized.length <= SAVE_SIZE_LIMIT ? serialized : '';
}

/** Loads the standalone local save. Corrupt data is backed up, then ignored. */
export function loadLocalSave(): GameSave | null {
  try {
    const rawText = localStorage.getItem(SAVE_KEY);
    if (rawText === null) return null;
    const save = parseSaveString(rawText);
    if (save) return save;
    // Corrupt or foreign payload: keep a copy, then start fresh.
    localStorage.setItem(BACKUP_KEY, rawText);
    localStorage.removeItem(SAVE_KEY);
    return null;
  } catch {
    return null;
  }
}

/** Writes the standalone local save. */
export function storeLocalSave(save: GameSave): void {
  try {
    const serialized = serializeSave(save);
    if (serialized) localStorage.setItem(SAVE_KEY, serialized);
  } catch {
    // Storage unavailable: the game keeps running without saves.
  }
}
