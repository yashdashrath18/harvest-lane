import {
  CONTRACT_SLOTS,
  CONTRACT_TEMPLATES,
  DAILY_POOL,
  MISSIONS,
  contractTarget,
  dailyIdsFor,
  localDateKey,
  type MissionDefinition,
  type MissionKind,
} from '../data/MissionData';
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

/** One live endless contract, generated from a template at a tier. */
export interface ContractInstance {
  uid: string;
  templateKey: string;
  tier: number;
  target: number;
  rewardCoins: number;
  rewardGems: number;
}

export interface ContractsSaveState {
  seq: number;
  rotation: number;
  tiers: Record<string, number>;
  active: ContractInstance[];
}

export interface MissionSnapshot {
  progress: Record<string, number>;
  claimed: string[];
  daily?: {
    date: string;
    ids: string[];
    progress: Record<string, number>;
    claimed: string[];
  };
  contracts?: ContractsSaveState;
}

function rewardTextOf(coins: number, gems: number): { rewardText: string; rewardKind: 'coins' | 'gems' } {
  const rewards: string[] = [];
  if (coins) rewards.push(`${coins} coins`);
  if (gems) rewards.push(`${gems} gems`);
  return { rewardText: rewards.join(' + '), rewardKind: gems ? 'gems' : 'coins' };
}

/**
 * Mission progress and claiming. Pure logic: gameplay systems report
 * events with track(), the panel renders describe(), and claim()
 * pays the reward into the market wallet exactly once.
 */
export class MissionSystem {
  private progress = new Map<string, number>();
  private claimed = new Set<string>();
  private activeContracts: ContractInstance[] = [];
  private contractSeq = 0;
  private contractRotation = 0;
  private contractTiers = new Map<string, number>();
  private dailyDate = '';
  private dailyIds: string[] = [];
  private dailyProgress = new Map<string, number>();
  private dailyClaimed = new Set<string>();

  /** Rolls the daily set over when the local calendar day changes. */
  private ensureDaily(): void {
    const today = localDateKey();
    if (this.dailyDate === today && this.dailyIds.length > 0) return;
    this.dailyDate = today;
    this.dailyIds = dailyIdsFor(today);
    this.dailyProgress.clear();
    this.dailyClaimed.clear();
  }

  /** Panel-ready snapshot of today's three daily missions. */
  describeDaily(): MissionRowState[] {
    this.ensureDaily();
    return this.dailyIds
      .map((id) => DAILY_POOL.find((d) => d.id === id))
      .filter((d): d is NonNullable<typeof d> => !!d)
      .map((def) => {
        const progress = this.dailyProgress.get(def.id) ?? 0;
        return {
          id: def.id,
          title: def.title,
          progress: Math.min(progress, def.target),
          target: def.target,
          complete: progress >= def.target,
          claimed: this.dailyClaimed.has(def.id),
          ...rewardTextOf(def.rewardCoins ?? 0, def.rewardGems ?? 0),
        };
      });
  }

  /** Contracts unlock the moment every base mission has been claimed. */
  get contractsUnlocked(): boolean {
    return MISSIONS.every((m) => this.claimed.has(m.id));
  }

  get activeContractCount(): number {
    return this.activeContracts.length;
  }

  /** Keeps the contract board full while it is unlocked. */
  private ensureContracts(): void {
    if (!this.contractsUnlocked) return;
    while (this.activeContracts.length < CONTRACT_SLOTS) {
      if (!this.spawnContract()) break;
    }
  }

  /** Generates the next contract in template rotation. False when every template is already active. */
  private spawnContract(): boolean {
    const activeKeys = new Set(this.activeContracts.map((c) => c.templateKey));
    for (let i = 0; i < CONTRACT_TEMPLATES.length; i++) {
      const idx = (this.contractRotation + i) % CONTRACT_TEMPLATES.length;
      const template = CONTRACT_TEMPLATES[idx];
      if (activeKeys.has(template.key)) continue;
      const tier = this.contractTiers.get(template.key) ?? 0;
      this.contractTiers.set(template.key, tier + 1);
      const target = contractTarget(template, tier);
      const rewardGems =
        template.gemEvery && template.gemReward && (tier + 1) % template.gemEvery === 0
          ? template.gemReward
          : 0;
      this.contractSeq += 1;
      this.activeContracts.push({
        uid: `contract-${template.kind}-${template.itemId ?? 'any'}-${this.contractSeq}`,
        templateKey: template.key,
        tier,
        target,
        rewardCoins: Math.round(target * template.coinRate),
        rewardGems,
      });
      this.contractRotation = (idx + 1) % CONTRACT_TEMPLATES.length;
      return true;
    }
    return false;
  }

  /** Records a gameplay event against every matching live mission and contract. */
  track(kind: MissionKind, itemId: string | undefined, amount: number): void {
    if (amount <= 0) return;
    this.ensureContracts();
    MISSIONS.forEach((mission) => {
      if (this.claimed.has(mission.id)) return;
      if (mission.kind !== kind) return;
      if (mission.itemId !== undefined && mission.itemId !== itemId) return;
      this.progress.set(mission.id, (this.progress.get(mission.id) ?? 0) + amount);
    });
    this.activeContracts.forEach((contract) => {
      const template = CONTRACT_TEMPLATES.find((t) => t.key === contract.templateKey);
      if (!template) return;
      if (template.kind !== kind) return;
      if (template.itemId !== undefined && template.itemId !== itemId) return;
      this.progress.set(contract.uid, (this.progress.get(contract.uid) ?? 0) + amount);
    });
    this.ensureDaily();
    DAILY_POOL.forEach((def) => {
      if (!this.dailyIds.includes(def.id) || this.dailyClaimed.has(def.id)) return;
      if (def.kind !== kind) return;
      if (def.itemId !== undefined && def.itemId !== itemId) return;
      this.dailyProgress.set(def.id, (this.dailyProgress.get(def.id) ?? 0) + amount);
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

  /** Pays the reward if the mission, daily mission or contract is complete and unclaimed. */
  claim(id: string, market: MarketSystem): boolean {
    this.ensureDaily();
    const daily = DAILY_POOL.find((d) => d.id === id);
    if (daily && this.dailyIds.includes(id)) {
      if (this.dailyClaimed.has(id)) return false;
      if ((this.dailyProgress.get(id) ?? 0) < daily.target) return false;
      this.dailyClaimed.add(id);
      if (daily.rewardCoins) market.addCoins(daily.rewardCoins);
      if (daily.rewardGems) market.addGems(daily.rewardGems);
      return true;
    }
    const contract = this.activeContracts.find((c) => c.uid === id);
    if (contract) {
      if (this.progressOf(id) < contract.target) return false;
      if (contract.rewardCoins) market.addCoins(contract.rewardCoins);
      if (contract.rewardGems) market.addGems(contract.rewardGems);
      this.activeContracts = this.activeContracts.filter((c) => c.uid !== id);
      this.progress.delete(id);
      this.ensureContracts();
      return true;
    }
    const mission = MISSIONS.find((m) => m.id === id);
    if (!mission || this.claimed.has(id) || !this.isComplete(mission)) return false;
    this.claimed.add(id);
    if (mission.rewardCoins) market.addCoins(mission.rewardCoins);
    if (mission.rewardGems) market.addGems(mission.rewardGems);
    this.ensureContracts();
    return true;
  }

  /** Panel-ready snapshot: the base missions, then any live contracts. */
  describe(): MissionRowState[] {
    this.ensureContracts();
    const rows: MissionRowState[] = MISSIONS.map((mission) => ({
      id: mission.id,
      title: mission.title,
      progress: Math.min(this.progressOf(mission.id), mission.target),
      target: mission.target,
      complete: this.isComplete(mission),
      claimed: this.claimed.has(mission.id),
      ...rewardTextOf(mission.rewardCoins ?? 0, mission.rewardGems ?? 0),
    }));
    this.activeContracts.forEach((contract) => {
      const template = CONTRACT_TEMPLATES.find((t) => t.key === contract.templateKey);
      if (!template) return;
      const progress = this.progressOf(contract.uid);
      rows.push({
        id: contract.uid,
        title: `Contract: ${template.title(contract.target)}`,
        progress: Math.min(progress, contract.target),
        target: contract.target,
        complete: progress >= contract.target,
        claimed: false,
        ...rewardTextOf(contract.rewardCoins, contract.rewardGems),
      });
    });
    return rows;
  }

  /** True when at least one mission, daily mission or contract can be claimed right now. */
  hasClaimable(): boolean {
    if (MISSIONS.some((m) => this.isComplete(m) && !this.claimed.has(m.id))) return true;
    if (this.activeContracts.some((c) => this.progressOf(c.uid) >= c.target)) return true;
    this.ensureDaily();
    return this.dailyIds.some((id) => {
      const def = DAILY_POOL.find((d) => d.id === id);
      return def && !this.dailyClaimed.has(id) && (this.dailyProgress.get(id) ?? 0) >= def.target;
    });
  }

  /** Save snapshot: progress, claimed missions, and the contract board state. */
  snapshot(): MissionSnapshot {
    const progress: Record<string, number> = {};
    this.progress.forEach((value, id) => {
      if (value > 0) progress[id] = value;
    });
    const tiers: Record<string, number> = {};
    this.contractTiers.forEach((value, key) => {
      tiers[key] = value;
    });
    this.ensureDaily();
    const dailyProgress: Record<string, number> = {};
    this.dailyProgress.forEach((value, id) => {
      if (value > 0) dailyProgress[id] = value;
    });
    return {
      progress,
      claimed: [...this.claimed],
      daily: {
        date: this.dailyDate,
        ids: [...this.dailyIds],
        progress: dailyProgress,
        claimed: [...this.dailyClaimed],
      },
      contracts: {
        seq: this.contractSeq,
        rotation: this.contractRotation,
        tiers,
        active: this.activeContracts.map((c) => ({ ...c })),
      },
    };
  }

  /** Restores progress, claims and contracts, ignoring unknown ids. Old saves without a contracts block simply start the board fresh. */
  restore(data: MissionSnapshot): void {
    this.progress.clear();
    this.claimed.clear();
    this.activeContracts = [];
    this.contractSeq = 0;
    this.contractRotation = 0;
    this.contractTiers.clear();
    this.dailyDate = '';
    this.dailyIds = [];
    this.dailyProgress.clear();
    this.dailyClaimed.clear();
    if (data.daily && typeof data.daily.date === 'string') {
      const ids = (data.daily.ids ?? []).filter((id) => DAILY_POOL.some((d) => d.id === id));
      if (ids.length > 0) {
        this.dailyDate = data.daily.date;
        this.dailyIds = ids;
        ids.forEach((id) => {
          const value = data.daily!.progress?.[id];
          if (typeof value === 'number' && value > 0) this.dailyProgress.set(id, Math.floor(value));
          if (data.daily!.claimed?.includes(id)) this.dailyClaimed.add(id);
        });
      }
    }
    this.ensureDaily();
    MISSIONS.forEach((mission) => {
      const value = data.progress[mission.id];
      if (typeof value === 'number' && value > 0) {
        this.progress.set(mission.id, Math.floor(value));
      }
      if (data.claimed.includes(mission.id)) this.claimed.add(mission.id);
    });
    const saved = data.contracts;
    if (saved) {
      this.contractSeq = Math.max(0, Math.floor(saved.seq) || 0);
      this.contractRotation = Math.max(0, Math.floor(saved.rotation) || 0) % CONTRACT_TEMPLATES.length;
      Object.entries(saved.tiers ?? {}).forEach(([key, value]) => {
        if (CONTRACT_TEMPLATES.some((t) => t.key === key) && typeof value === 'number' && value > 0) {
          this.contractTiers.set(key, Math.floor(value));
        }
      });
      (saved.active ?? []).forEach((c) => {
        if (!c || typeof c.uid !== 'string') return;
        if (!CONTRACT_TEMPLATES.some((t) => t.key === c.templateKey)) return;
        if (this.activeContracts.length >= CONTRACT_SLOTS) return;
        this.activeContracts.push({
          uid: c.uid,
          templateKey: c.templateKey,
          tier: Math.max(0, Math.floor(c.tier) || 0),
          target: Math.max(1, Math.floor(c.target) || 1),
          rewardCoins: Math.max(0, Math.floor(c.rewardCoins) || 0),
          rewardGems: Math.max(0, Math.floor(c.rewardGems) || 0),
        });
        const value = data.progress[c.uid];
        if (typeof value === 'number' && value > 0) {
          this.progress.set(c.uid, Math.floor(value));
        }
      });
    }
    this.ensureContracts();
  }
}
