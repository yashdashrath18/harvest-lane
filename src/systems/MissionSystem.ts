import { MISSIONS, type MissionDefinition, type MissionKind } from '../data/MissionData';
import type { MarketSystem } from './MarketSystem';

export interface MissionRowState {
  id: string;
  title: string;
  progress: number;
  target: number;
  complete: boolean;
  claimed: boolean;
  rewardText: string;
  rewardKind: 'coins' | 'gems';
}

/**
 * Mission progress and claiming. Pure logic: gameplay systems report
 * events with track(), the panel renders describe(), and claim()
 * pays the reward into the market wallet exactly once.
 */
export class MissionSystem {
  private progress = new Map<string, number>();
  private claimed = new Set<string>();

  /** Records a gameplay event against every matching live mission. */
  track(kind: MissionKind, itemId: string | undefined, amount: number): void {
    if (amount <= 0) return;
    MISSIONS.forEach((mission) => {
      if (this.claimed.has(mission.id)) return;
      if (mission.kind !== kind) return;
      if (mission.itemId !== undefined && mission.itemId !== itemId) return;
      this.progress.set(mission.id, (this.progress.get(mission.id) ?? 0) + amount);
    });
  }

  progressOf(id: string): number {
    return this.progress.get(id) ?? 0;
  }

  isComplete(mission: MissionDefinition): boolean {
    return this.progressOf(mission.id) >= mission.target;
  }

  isClaimed(id: string): boolean {
    return this.claimed.has(id);
  }

  /** Pays the reward if the mission is complete and unclaimed. */
  claim(id: string, market: MarketSystem): boolean {
    const mission = MISSIONS.find((m) => m.id === id);
    if (!mission || this.claimed.has(id) || !this.isComplete(mission)) return false;
    this.claimed.add(id);
    if (mission.rewardCoins) market.addCoins(mission.rewardCoins);
    if (mission.rewardGems) market.addGems(mission.rewardGems);
    return true;
  }

  /** Panel-ready snapshot of every mission. */
  describe(): MissionRowState[] {
    return MISSIONS.map((mission) => {
      const rewards: string[] = [];
      if (mission.rewardCoins) rewards.push(`${mission.rewardCoins} coins`);
      if (mission.rewardGems) rewards.push(`${mission.rewardGems} gems`);
      return {
        id: mission.id,
        title: mission.title,
        progress: Math.min(this.progressOf(mission.id), mission.target),
        target: mission.target,
        complete: this.isComplete(mission),
        claimed: this.claimed.has(mission.id),
        rewardText: rewards.join(' + '),
        rewardKind: mission.rewardGems ? 'gems' : 'coins',
      };
    });
  }

  /** True when at least one mission can be claimed right now. */
  hasClaimable(): boolean {
    return MISSIONS.some((m) => this.isComplete(m) && !this.claimed.has(m.id));
  }

  /** Save snapshot: progress per mission and claimed mission ids. */
  snapshot(): { progress: Record<string, number>; claimed: string[] } {
    const progress: Record<string, number> = {};
    this.progress.forEach((value, id) => {
      if (value > 0) progress[id] = value;
    });
    return { progress, claimed: [...this.claimed] };
  }

  /** Restores progress and claims, ignoring unknown mission ids. */
  restore(data: { progress: Record<string, number>; claimed: string[] }): void {
    this.progress.clear();
    this.claimed.clear();
    MISSIONS.forEach((mission) => {
      const value = data.progress[mission.id];
      if (typeof value === 'number' && value > 0) {
        this.progress.set(mission.id, Math.floor(value));
      }
      if (data.claimed.includes(mission.id)) this.claimed.add(mission.id);
    });
  }
}
