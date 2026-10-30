/**
 * Shared event bus for decoupled scene/system communication (for
 * example, GameScene reporting player state changes to UIScene).
 *
 * Implemented as a tiny standalone emitter rather than Phaser's so
 * pure-logic systems (backpack, economy) can emit events and be unit
 * tested outside a running game, with no browser window required.
 */
type Listener = (...args: never[]) => void;

class SimpleEventBus {
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)?.add(listener);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((listener) => {
      (listener as (...a: unknown[]) => void)(...args);
    });
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

export const EventBus = new SimpleEventBus();

export const GameEvents = {
  PlayerMoved: 'player-moved',
  PlayerStopped: 'player-stopped',
  /** Payload: (count: number, capacity: number) */
  BackpackChanged: 'backpack-changed',
  /** Payload: (nearby: boolean) whether a ready crop is in harvest range. */
  CropNearbyChanged: 'crop-nearby-changed',
  /** Emitted by the on-screen harvest button. */
  HarvestPressed: 'harvest-pressed',
  /** Payload: (coins: number) the player's new coin total. */
  CoinsChanged: 'coins-changed',
  /** Payload: (itemId: string, count: number) stall stock for an item. */
  StockChanged: 'stock-changed',
  /** Payload: (gems: number) the player's new gem total. */
  GemsChanged: 'gems-changed',
  /** Payload: (trackId: string) shop wants to buy an upgrade level. */
  ShopBuyUpgrade: 'shop-buy-upgrade',
  /** Shop wants to unlock the gated area. */
  ShopBuyArea: 'shop-buy-area',
  /** Shop opened and needs a fresh state snapshot. */
  ShopRequestState: 'shop-request-state',
  /** Payload: (state) full shop snapshot from the game scene. */
  ShopState: 'shop-state',
  /** Payload: (missionId: string) panel wants to claim a mission. */
  MissionClaim: 'mission-claim',
  /** Missions panel opened and needs a fresh snapshot. */
  MissionsRequestState: 'missions-request-state',
  /** Payload: (state) missions snapshot from the game scene. */
  MissionsState: 'missions-state',
  /** Payload: (text: string) current objective line for the HUD. */
  ObjectiveUpdated: 'objective-updated',
  /** The HUD asks the game for the current objective (on boot). */
  ObjectiveRequest: 'objective-request',
  /** Something in the world asks the UI to open the shop panel. */
  OpenShop: 'open-shop',
} as const;
