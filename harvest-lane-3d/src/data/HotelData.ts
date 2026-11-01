/**
 * The Grand Hotel (master prompt 8): a locked landmark for this
 * pass. The building stands in the world from the start, its door
 * barriered and its sign counting the player down to Level 10.
 * Reaching Level 10 unlocks it (barrier drops, sign changes, full
 * celebration) but there is NO hotel gameplay yet: the types below
 * are the data model the future hotel update will build on, kept
 * here so that work starts from defined shapes, not inventions.
 */
export const HOTEL_UNLOCK_LEVEL = 10;
export const HOTEL_NAME = 'Grand Hotel';

export interface HotelRoomDef {
  id: string;
  name: string;
  /** Guests the room sleeps. */
  capacity: number;
  /** Coins per night when the hotel opens. */
  nightlyRate: number;
  /** Farm level at which this room tier can be built. */
  buildLevel: number;
}

/** Room tiers for the future hotel system (data model only). */
export const HOTEL_ROOMS: HotelRoomDef[] = [
  { id: 'room-cosy', name: 'Cosy Room', capacity: 2, nightlyRate: 45, buildLevel: 10 },
  { id: 'room-family', name: 'Family Room', capacity: 4, nightlyRate: 80, buildLevel: 12 },
  { id: 'room-suite', name: 'Harvest Suite', capacity: 4, nightlyRate: 140, buildLevel: 15 },
  { id: 'room-penthouse', name: 'Penthouse', capacity: 6, nightlyRate: 240, buildLevel: 20 },
];

/** The hotel's persistent state, as the future system will keep it. */
export interface HotelState {
  unlocked: boolean;
  /** Room ids built so far (empty until the hotel update ships). */
  roomsBuilt: string[];
  /** 1-5 star reputation, earned from guest stays (future). */
  reputation: number;
}

export function defaultHotelState(): HotelState {
  return { unlocked: false, roomsBuilt: [], reputation: 1 };
}
