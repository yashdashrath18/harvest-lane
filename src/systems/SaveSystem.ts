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

export const SAVE_VERSION = 1;
const SAVE_KEY = 'harvest-lane-save:game-save';
const BACKUP_KEY = 'harvest-lane-save:game-save-corrupt-backup';
export const SAVE_SIZE_LIMIT = 3 * 1024 * 1024; // Playables saveData cap

export interface GameSave {
  version: number;
  savedAt: number;
  coins: number;
  gems: number;
  stock: Record<string, number>;
  backpack: Record<string, number>;
  upgrades: Record<string, number>;
  areaUnlocked: boolean;
  missions: {
    progress: Record<string, number>;
    claimed: string[];
  };
  player: { x: number; y: number };
  audio: { musicVolume: number; sfxVolume: number };
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

function cleanVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
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
    stock: numberRecord(raw.stock),
    backpack: numberRecord(raw.backpack),
    upgrades: numberRecord(raw.upgrades),
    areaUnlocked: raw.areaUnlocked === true,
    missions: {
      progress: numberRecord(missionsRaw.progress),
      claimed: Array.isArray(missionsRaw.claimed)
        ? missionsRaw.claimed.filter((id): id is string => typeof id === 'string')
        : [],
    },
    player: {
      x: typeof playerRaw.x === 'number' && Number.isFinite(playerRaw.x) ? playerRaw.x : 540,
      y: typeof playerRaw.y === 'number' && Number.isFinite(playerRaw.y) ? playerRaw.y : 910,
    },
    audio: {
      musicVolume: cleanVolume(audioRaw.musicVolume, 0.7),
      sfxVolume: cleanVolume(audioRaw.sfxVolume, 0.9),
    },
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
  // Future migrations slot in here, one step per version, e.g.
  // if (version === 0) raw = migrate0to1(raw) then fall through.
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
