import { describe, expect, it } from 'vitest';
import { HOTEL_NAME, HOTEL_ROOMS, HOTEL_UNLOCK_LEVEL, defaultHotelState } from '../src/data/HotelData';

describe('HotelData (landmark pass: data model only)', () => {
  it('unlocks at Level 10 and starts locked with no rooms', () => {
    expect(HOTEL_UNLOCK_LEVEL).toBe(10);
    expect(HOTEL_NAME).toBe('Grand Hotel');
    const s = defaultHotelState();
    expect(s.unlocked).toBe(false);
    expect(s.roomsBuilt).toEqual([]);
    expect(s.reputation).toBe(1);
  });

  it('room tiers scale by capacity, rate and build level', () => {
    expect(HOTEL_ROOMS.length).toBe(4);
    const rates = HOTEL_ROOMS.map((r) => r.nightlyRate);
    expect(rates).toEqual([...rates].sort((a, b) => a - b));
    expect(HOTEL_ROOMS[0].buildLevel).toBe(HOTEL_UNLOCK_LEVEL);
    for (const r of HOTEL_ROOMS) {
      expect(r.capacity).toBeGreaterThan(0);
      expect(r.buildLevel).toBeGreaterThanOrEqual(HOTEL_UNLOCK_LEVEL);
    }
  });
});
