import { describe, it, expect } from 'vitest';
import { Audio } from '../src/systems/AudioSystem';

describe('AudioSystem settings', () => {
  it('starts with sane default volumes', () => {
    expect(Audio.settings.musicVolume).toBeGreaterThan(0);
    expect(Audio.settings.musicVolume).toBeLessThanOrEqual(1);
    expect(Audio.settings.sfxVolume).toBeGreaterThan(0);
    expect(Audio.settings.sfxVolume).toBeLessThanOrEqual(1);
  });

  it('updates music and sfx volumes independently without a context', () => {
    Audio.setMusicVolume(0.25);
    Audio.setSfxVolume(0.5);
    expect(Audio.settings.musicVolume).toBe(0.25);
    expect(Audio.settings.sfxVolume).toBe(0.5);
    Audio.setMusicVolume(0.7);
    expect(Audio.settings.sfxVolume).toBe(0.5);
  });

  it('sound effect calls are safe before the context exists', () => {
    expect(() => {
      Audio.playClick();
      Audio.playHarvest();
      Audio.playCoin();
      Audio.playSuccess();
      Audio.playCluck();
    }).not.toThrow();
  });
});
