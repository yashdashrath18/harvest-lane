/**
 * The single bridge between Harvest Lane and the YouTube Playables
 * SDK, written against the official SDK reference and integration
 * requirements (developers.google.com/youtube/gaming/playables,
 * checked 2026-10-30).
 *
 * Contract highlights honoured here:
 * - The SDK script (https://www.youtube.com/game_api/v1) is loaded in
 *   index.html before any game code, as required. This adapter only
 *   ever reads the global ytgame object; it never writes it.
 * - firstFrameReady() is called before gameReady(), and gameReady()
 *   only once the game is interactable.
 * - Cloud saves: loadData() is always awaited before the first
 *   saveData(), so a fresh session can never overwrite an old save.
 * - Audio: the platform mute (isAudioEnabled / onAudioEnabledChange)
 *   is exposed for the AudioSystem; when the platform mutes, in-game
 *   controls cannot unmute (enforced in AudioSystem's gain maths).
 * - Pause and resume come only from onPause / onResume in the
 *   Playables environment; the Page Visibility API is not used there.
 * - Everything is guarded: with no SDK, or outside the Playables
 *   environment, every method is a safe no-op and the game runs in
 *   standalone mode on localStorage.
 */

interface YtGameSdk {
  IN_PLAYABLES_ENV: boolean;
  SDK_VERSION?: string;
  game: {
    firstFrameReady(): void;
    gameReady(): void;
    loadData(): Promise<string>;
    saveData(data: string): Promise<void>;
  };
  system: {
    isAudioEnabled(): boolean;
    onAudioEnabledChange(callback: (enabled: boolean) => void): () => void;
    onPause(callback: () => void): () => void;
    onResume(callback: () => void): () => void;
    getLanguage(): Promise<string>;
  };
  ads: {
    requestRewardedAd(rewardId: string): Promise<boolean>;
    requestInterstitialAd(): Promise<void>;
  };
}

function sdk(): YtGameSdk | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { ytgame?: YtGameSdk }).ytgame;
  return candidate && typeof candidate === 'object' ? candidate : null;
}

class YouTubePlayablesAdapter {
  private firstFrameSent = false;
  private gameReadySent = false;
  private loadPromise: Promise<string | null> | null = null;
  private loadSettled = false;

  /** True only when actually running inside YouTube Playables. */
  get inPlayablesEnv(): boolean {
    const yt = sdk();
    return !!yt && yt.IN_PLAYABLES_ENV === true;
  }

  /** True when the SDK script loaded at all (any environment). */
  get sdkPresent(): boolean {
    return sdk() !== null;
  }

  /** Call when the first frame renders. Must precede gameReady. */
  firstFrameReady(): void {
    const yt = sdk();
    if (!yt || this.firstFrameSent) return;
    try {
      yt.game.firstFrameReady();
      this.firstFrameSent = true;
    } catch {
      // SDK errors must never break the game itself.
    }
  }

  /** Call once the game is interactable (menu or gameplay visible). */
  gameReady(): void {
    const yt = sdk();
    if (!yt || this.gameReadySent) return;
    this.firstFrameReady();
    try {
      yt.game.gameReady();
      this.gameReadySent = true;
    } catch {
      // As above.
    }
  }

  /**
   * Loads the cloud save string, or null outside the Playables
   * environment / when no save exists / on error. The result is
   * cached: the SDK requires loadData to complete before saveData,
   * and one load per session is the correct shape anyway.
   */
  loadCloudSave(): Promise<string | null> {
    if (!this.inPlayablesEnv) return Promise.resolve(null);
    if (!this.loadPromise) {
      const yt = sdk()!;
      this.loadPromise = yt.game
        .loadData()
        .then((data) => {
          this.loadSettled = true;
          return typeof data === 'string' && data.length > 0 ? data : null;
        })
        .catch(() => {
          this.loadSettled = true;
          return null;
        });
    }
    return this.loadPromise;
  }

  /**
   * Saves to the cloud. Always waits for the initial loadData first,
   * per the integration requirements. No-op outside the environment.
   */
  async saveCloudSave(serialized: string): Promise<void> {
    if (!this.inPlayablesEnv || !serialized) return;
    await this.loadCloudSave();
    if (!this.loadSettled) return;
    try {
      await sdk()!.game.saveData(serialized);
    } catch {
      // A failed cloud save leaves the local session state intact;
      // the next autosave retries with the same data.
    }
  }

  /** Platform audio state, or null when the SDK cannot say. */
  isAudioEnabled(): boolean | null {
    const yt = sdk();
    if (!yt || !this.inPlayablesEnv) return null;
    try {
      return yt.system.isAudioEnabled();
    } catch {
      return null;
    }
  }

  /** Registers the platform audio callback (Playables env only). */
  onAudioEnabledChange(callback: (enabled: boolean) => void): void {
    const yt = sdk();
    if (!yt || !this.inPlayablesEnv) return;
    try {
      yt.system.onAudioEnabledChange(callback);
    } catch {
      // No-op.
    }
  }

  /** Registers platform pause and resume callbacks (env only). */
  onPauseResume(handlers: { onPause: () => void; onResume: () => void }): void {
    const yt = sdk();
    if (!yt || !this.inPlayablesEnv) return;
    try {
      yt.system.onPause(handlers.onPause);
      yt.system.onResume(handlers.onResume);
    } catch {
      // No-op.
    }
  }

  /**
   * Requests a rewarded ad and resolves true only when the SDK
   * confirms the reward was earned. There is deliberately no in-game
   * placement calling this yet: no fake rewards exist anywhere.
   */
  async requestRewardedAd(rewardId: string): Promise<boolean> {
    const yt = sdk();
    if (!yt || !this.inPlayablesEnv) return false;
    try {
      return await yt.ads.requestRewardedAd(rewardId);
    } catch {
      return false;
    }
  }
}

export const Playables = new YouTubePlayablesAdapter();
