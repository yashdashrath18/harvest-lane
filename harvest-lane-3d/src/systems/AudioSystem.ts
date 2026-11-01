import { loadLocal, saveLocal } from '../utils/StorageUtils';
import { assetUrl } from '../utils/assetUrl';

interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
}

const DEFAULT_SETTINGS: AudioSettings = { musicVolume: 0.7, sfxVolume: 0.9 };

/**
 * Inside YouTube Playables, progress (including these volumes) lives
 * in the cloud save, and localStorage is not used. Checked through
 * the global only, so this module stays free of platform imports.
 */
function inPlayablesEnv(): boolean {
  if (typeof window === 'undefined') return false;
  const yt = (window as unknown as { ytgame?: { IN_PLAYABLES_ENV?: boolean } }).ytgame;
  return !!yt && yt.IN_PLAYABLES_ENV === true;
}

const NOTE = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
  G3: 196.0, B3: 246.94, A3: 220.0, F3: 174.61, E3: 164.81,
};

// An original gentle progression (I V vi IV in C) with soft pentatonic
// plucks on top. Composed in code for this game; no audio files.
const CHORDS: number[][] = [
  [NOTE.C4, NOTE.E4, NOTE.G4],
  [NOTE.G3, NOTE.B3, NOTE.D4],
  [NOTE.A3, NOTE.C4, NOTE.E4],
  [NOTE.F3, NOTE.A3, NOTE.C4],
];
const MELODY = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.E5, NOTE.D5];
const CHORD_MS = 2400;

/**
 * Music is synthesized with WebAudio (an original progression,
 * composed in code). Sound effects play real CC0 samples from
 * Kenney's audio packs (embedded in the bundle, docs/ASSETS.md) when
 * they have loaded, and fall back to the original synthesized
 * effects when they have not, so the game never depends on the
 * files. Music and effects have independent volumes, persisted
 * via StorageUtils. The context starts on the first user gesture,
 * as browsers require.
 */
const SAMPLE_FILES: Record<string, string> = {
  click: 'click.ogg',
  confirm: 'confirm.ogg',
  error: 'error.ogg',
  chop: 'chop.ogg',
  pluck: 'pluck.ogg',
  chips1: 'chips1.ogg',
  chips2: 'chips2.ogg',
  jingle: 'jingle.ogg',
  step0: 'step0.ogg',
  step1: 'step1.ogg',
  step2: 'step2.ogg',
  step3: 'step3.ogg',
  step4: 'step4.ogg',
};
class AudioSystem {
  settings: AudioSettings = { ...DEFAULT_SETTINGS };
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private chordIndex = 0;
  private nextChordAt = 0;
  private platformMuted = false;
  private samples = new Map<string, AudioBuffer>();
  private stepIndex = 0;
  private coinFlip = false;

  constructor() {
    if (inPlayablesEnv()) return; // volumes arrive with the cloud save
    const saved = loadLocal<AudioSettings>('settings');
    if (saved) {
      if (typeof saved.musicVolume === 'number') this.settings.musicVolume = saved.musicVolume;
      if (typeof saved.sfxVolume === 'number') this.settings.sfxVolume = saved.sfxVolume;
    }
  }

  /**
   * The Playables platform mute sits above the in-game sliders: when
   * it is on, output is zero no matter where the sliders are, exactly
   * as the integration requirements demand.
   */
  setPlatformMuted(muted: boolean): void {
    if (this.platformMuted === muted) return;
    this.platformMuted = muted;
    this.applyGains();
  }

  get isPlatformMuted(): boolean {
    return this.platformMuted;
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private applyGains(): void {
    const factor = this.platformMuted ? 0 : 1;
    if (this.sfxGain) this.sfxGain.gain.value = this.settings.sfxVolume * factor;
    if (this.musicGain) this.musicGain.gain.value = this.settings.musicVolume * factor;
  }

  private persistSettings(): void {
    if (inPlayablesEnv()) return; // carried by the cloud save instead
    saveLocal('settings', this.settings);
  }

  /** Creates the context. Call from a user gesture handler. */
  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.applyGains();
      this.startMusic();
      void this.loadSamples();
    } catch {
      this.ctx = null;
    }
  }

  /** Loads the CC0 sample set in the background; failures just keep the synth fallback. */
  private async loadSamples(): Promise<void> {
    if (!this.ctx) return;
    const ctx = this.ctx;
    await Promise.all(
      Object.entries(SAMPLE_FILES).map(async ([name, file]) => {
        try {
          const res = await fetch(assetUrl(`audio/${file}`));
          if (!res.ok) return;
          const buf = await ctx.decodeAudioData(await res.arrayBuffer());
          this.samples.set(name, buf);
        } catch {
          /* sample unavailable: the synth version of the effect is used */
        }
      }),
    );
  }

  /** Plays a loaded sample through the SFX bus. Returns false when it is not available. */
  private sample(name: string, volume = 1, rate = 1): boolean {
    if (!this.ctx || !this.sfxGain || this.settings.sfxVolume <= 0) return false;
    const buf = this.samples.get(name);
    if (!buf) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    if (volume >= 0.999) {
      src.connect(this.sfxGain);
    } else {
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      src.connect(gain);
      gain.connect(this.sfxGain);
    }
    src.start();
    return true;
  }

  setMusicVolume(value: number): void {
    this.settings.musicVolume = value;
    this.applyGains();
    this.persistSettings();
  }

  setSfxVolume(value: number): void {
    this.settings.sfxVolume = value;
    this.applyGains();
    this.persistSettings();
  }

  private tone(
    destination: GainNode,
    freq: number,
    startAt: number,
    duration: number,
    type: OscillatorType,
    peak: number,
    slideTo?: number,
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, startAt + duration);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.05);
  }

  private sfx(notes: Array<{ f: number; d: number; t?: OscillatorType; v?: number; slide?: number; at?: number }>): void {
    if (!this.ctx || !this.sfxGain || this.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    notes.forEach((n) => {
      this.tone(this.sfxGain!, n.f, now + (n.at ?? 0), n.d, n.t ?? 'sine', n.v ?? 0.25, n.slide);
    });
  }

  playClick(): void {
    if (this.sample('click', 0.9)) return;
    this.sfx([{ f: 620, d: 0.06, t: 'square', v: 0.12 }]);
  }

  playHarvest(): void {
    if (this.sample('chop', 0.85, 1 + Math.random() * 0.1)) return;
    this.sfx([
      { f: 340, d: 0.09, v: 0.22, slide: 540 },
      { f: 520, d: 0.08, v: 0.15, at: 0.05, slide: 760 },
    ]);
  }

  /** Planting: a soft low thud with a short rustle, pitch-varied. */
  playPlant(): void {
    const vary = 1 + (Math.random() - 0.5) * 0.16;
    this.sfx([
      { f: 110 * vary, d: 0.09, v: 0.25, slide: 70 },
      { f: 300 * vary, d: 0.05, v: 0.07, at: 0.03, slide: 190 },
    ]);
  }

  playPickup(): void {
    if (this.sample('pluck', 0.8, 1 + Math.random() * 0.08)) return;
    this.sfx([{ f: 700, d: 0.07, v: 0.16, slide: 940 }]);
  }

  playCoin(): void {
    this.coinFlip = !this.coinFlip;
    if (this.sample(this.coinFlip ? 'chips1' : 'chips2', 0.85)) return;
    this.sfx([
      { f: 988, d: 0.08, t: 'square', v: 0.1 },
      { f: 1319, d: 0.16, t: 'square', v: 0.1, at: 0.07 },
    ]);
  }

  playSuccess(): void {
    if (this.sample('confirm', 0.9)) return;
    this.sfx([
      { f: NOTE.C5, d: 0.14, v: 0.2 },
      { f: NOTE.E5, d: 0.14, v: 0.2, at: 0.1 },
      { f: NOTE.G5, d: 0.24, v: 0.22, at: 0.2 },
    ]);
  }

  playUpgrade(): void {
    if (this.sample('jingle', 0.75)) return;
    this.sfx([
      { f: 523, d: 0.1, v: 0.18 },
      { f: 784, d: 0.18, v: 0.18, at: 0.08 },
    ]);
  }

  playError(): void {
    if (this.sample('error', 0.7)) return;
    this.sfx([{ f: 150, d: 0.16, t: 'sawtooth', v: 0.12, slide: 110 }]);
  }

  /** Grass footsteps while the farmer walks; silent until the samples load. */
  playFootstep(): void {
    const name = `step${this.stepIndex % 5}`;
    this.stepIndex++;
    this.sample(name, 0.4, 0.94 + Math.random() * 0.12);
  }

  playCluck(): void {
    this.sfx([
      { f: 900, d: 0.05, t: 'square', v: 0.05, slide: 620 },
      { f: 840, d: 0.05, t: 'square', v: 0.04, at: 0.08, slide: 560 },
    ]);
  }

  playMoo(): void {
    this.sfx([{ f: 180, d: 0.4, t: 'triangle', v: 0.07, slide: 130 }]);
  }

  private startMusic(): void {
    if (!this.ctx || !this.musicGain || this.musicTimer !== null) return;
    this.nextChordAt = this.ctx.currentTime + 0.1;
    const tick = () => {
      if (!this.ctx || !this.musicGain) return;
      if (this.settings.musicVolume <= 0 || this.platformMuted) return;
      while (this.nextChordAt < this.ctx.currentTime + 0.6) {
        const chord = CHORDS[this.chordIndex % CHORDS.length];
        const start = Math.max(this.nextChordAt, this.ctx.currentTime);
        chord.forEach((f) => {
          this.tone(this.musicGain!, f, start, CHORD_MS / 1000, 'triangle', 0.05);
          this.tone(this.musicGain!, f * 2, start, CHORD_MS / 1000, 'sine', 0.015);
        });
        // Sparse pluck melody, deterministic per chord with variation.
        const pluckAt = start + (CHORD_MS / 1000) * (0.25 + ((this.chordIndex * 37) % 50) / 100);
        const note = MELODY[(this.chordIndex * 5 + 2) % MELODY.length];
        this.tone(this.musicGain!, note, pluckAt, 0.5, 'sine', 0.045);
        this.chordIndex++;
        this.nextChordAt += CHORD_MS / 1000;
      }
    };
    this.musicTimer = window.setInterval(tick, 400);
  }
}

export const Audio = new AudioSystem();
