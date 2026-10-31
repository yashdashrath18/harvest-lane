/**
 * DOM HUD for Harvest Lane 3D, mirroring the 2D game's converted
 * layout: avatar top-left, medallions down the left edge, currency
 * pills top-right, objective card top-centre, missions clipboard on
 * the right, backpack pill bottom-left, harvest button bottom-right.
 * Panels share the cream card, wood border and blue ribbon shell.
 */
export class HUD {
  readonly root: HTMLDivElement;
  private coinsEl: HTMLElement;
  private gemsEl: HTMLElement;
  private bagEl: HTMLElement;
  private bagFillEl: HTMLElement;
  private objectiveEl: HTMLElement;
  private objectiveChipEl: HTMLElement;
  private harvestBtn: HTMLButtonElement;
  private menuEl: HTMLDivElement;
  onHarvest: (() => void) | null = null;
  onOpenShop: (() => void) | null = null;
  onOpenMissions: (() => void) | null = null;
  onOpenSettings: (() => void) | null = null;
  onPillCoins: (() => void) | null = null;
  onPillGems: (() => void) | null = null;
  onPlay: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = `
      <div class="avatar-wrap">
        <div class="avatar"><svg viewBox="0 0 64 64" width="46" height="46"><circle cx="32" cy="36" r="13" fill="#f6c795"/><ellipse cx="32" cy="24" rx="21" ry="5" fill="#f0d060"/><rect x="21" y="8" width="22" height="13" rx="5" fill="#e3ba45"/><rect x="21" y="17" width="22" height="4" fill="#b5502f"/><circle cx="27" cy="36" r="1.9" fill="#333"/><circle cx="37" cy="36" r="1.9" fill="#333"/><path d="M27 42a6 6 0 0 0 10 0" stroke="#9a5b3c" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M14 64c2-8 9-12 18-12s16 4 18 12z" fill="#d65347"/></svg></div>
        <svg class="star" viewBox="0 0 24 24"><path d="M12 1.8l3.1 6.9 7.5.7-5.6 5 1.6 7.4L12 18l-6.6 3.8L7 14.4 1.4 9.4l7.5-.7z" fill="#ffc93c" stroke="#d9930d" stroke-width="1.4"/></svg>
      </div>
      <div class="level-badge"><span id="level-txt">Lv 1</span><div class="xp-track"><div class="xp-fill" id="xp-fill"></div></div></div>
      <div class="saved-tag" id="saved-tag">Saved ✓</div>
      <div class="medallions">
        <button class="medallion clickable" id="btn-settings">
          <span class="disc"><svg viewBox="0 0 24 24"><path d="M12 8.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 1 0 12 8.2zM21 13.6v-3.2l-2.9-.6a8 8 0 0 0-.7-1.7l1.7-2.5-2.3-2.3-2.5 1.7a8 8 0 0 0-1.7-.7L12 .5 10.4 3.3a8 8 0 0 0-1.7.7L6.2 2.3 3.9 4.6l1.7 2.5a8 8 0 0 0-.7 1.7L2 9.4v3.2l2.9.6c.2.6.4 1.2.7 1.7l-1.7 2.5 2.3 2.3 2.5-1.7c.5.3 1.1.5 1.7.7L12 23.5l1.6-2.8c.6-.2 1.2-.4 1.7-.7l2.5 1.7 2.3-2.3-1.7-2.5c.3-.5.5-1.1.7-1.7z" fill="#fff3d6" transform="scale(0.96)"/></svg></span>
          <span>SETTINGS</span>
        </button>
        <button class="medallion clickable" id="btn-shop">
          <span class="disc"><svg viewBox="0 0 24 24"><path d="M6 8V7a6 6 0 0 1 12 0v1h3v13H3V8zm2 0h8V7a4 4 0 0 0-8 0z" fill="#fff3d6"/></svg></span>
          <span>SHOP</span>
        </button>
      </div>
      <div class="pills">
        <div class="pill clickable" id="pill-coins"><span>🪙</span><span class="amt" id="coins">0</span><button class="plus clickable" id="plus-coins">+</button></div>
        <div class="pill clickable" id="pill-gems"><span>💎</span><span class="amt" id="gems">0</span><button class="plus clickable" id="plus-gems">+</button></div>
      </div>
      <div class="objective">
        <div class="chip" id="obj-chip">🌽</div>
        <div class="txt" id="obj-txt">...</div>
      </div>
      <button class="mission-btn clickable" id="btn-missions">
        <svg viewBox="0 0 44 54"><rect x="4" y="6" width="36" height="46" rx="6" fill="#8a5a2b"/><rect x="8" y="12" width="28" height="36" rx="4" fill="#fff6de"/><rect x="16" y="2" width="12" height="9" rx="3" fill="#c9cfd6"/><path d="M13 22l3 3 6-6M13 33l3 3 6-6M13 44l3 3 6-6" stroke="#57a639" stroke-width="3" fill="none"/></svg>
        <span>MISSION</span>
      </button>
      <div class="bag-pill">
        <div class="row"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 8V7a6 6 0 0 1 12 0v1h3v13H3V8zm2 0h8V7a4 4 0 0 0-8 0z" fill="#fdf3da"/></svg><span id="bag">0/10</span></div>
        <div class="bar"><div class="fill" id="bag-fill"></div></div>
      </div>
      <div class="stock-chip" id="stock-chip" style="display:none">Stall empty</div>
      <div class="hint">Drag the joystick to move, or use WASD</div>
      <button class="harvest-btn clickable" id="btn-harvest">HARVEST</button>
      <div id="menu">
        <h1>HARVEST<br/>LANE 3D</h1>
        <div class="sub">Grow it. Harvest it. Sell it.</div>
        <button class="play" id="btn-play">TAP TO PLAY</button>
      </div>
      <div class="panel-wrap" id="panel-wrap">
        <div class="panel">
          <div class="ribbon" id="panel-title">PANEL</div>
          <button class="close" id="panel-close">×</button>
          <div id="panel-body"></div>
        </div>
      </div>`;
    parent.appendChild(this.root);
    const $ = (id: string) => this.root.querySelector<HTMLElement>(`#${id}`)!;
    this.coinsEl = $('coins');
    this.gemsEl = $('gems');
    this.bagEl = $('bag');
    this.bagFillEl = $('bag-fill');
    this.objectiveEl = $('obj-txt');
    this.objectiveChipEl = $('obj-chip');
    this.harvestBtn = $('btn-harvest') as HTMLButtonElement;
    this.menuEl = $('menu') as HTMLDivElement;
    $('btn-play').addEventListener('click', () => this.onPlay?.());
    this.harvestBtn.addEventListener('click', () => this.onHarvest?.());
    $('btn-shop').addEventListener('click', () => this.onOpenShop?.());
    $('plus-coins').addEventListener('click', () => this.onOpenShop?.());
    $('btn-missions').addEventListener('click', () => this.onOpenMissions?.());
    $('plus-gems').addEventListener('click', () => this.onOpenMissions?.());
    $('btn-settings').addEventListener('click', () => this.onOpenSettings?.());
    $('pill-coins').addEventListener('click', () => this.onPillCoins?.());
    $('pill-gems').addEventListener('click', () => this.onPillGems?.());
    $('panel-close').addEventListener('click', () => this.closePanel());
  }

  /** Floating feedback text at a screen position (harvest pops). */
  floatText(text: string, screenX: number, screenY: number, color = '#fff'): void {
    const el = document.createElement('div');
    el.className = 'float-txt';
    el.textContent = text;
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    el.style.color = color;
    this.root.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  get stockChip(): HTMLElement {
    return this.root.querySelector<HTMLElement>('#stock-chip')!;
  }

  /** Shows the stall stock summary chip (positioned by the game). */
  setStock(text: string): void {
    const chip = this.root.querySelector<HTMLElement>('#stock-chip')!;
    chip.textContent = text;
    chip.style.display = text ? 'block' : 'none';
  }

  setCoins(n: number): void {
    this.coinsEl.textContent = `${n}`;
  }
  setGems(n: number): void {
    this.gemsEl.textContent = `${n}`;
  }
  setBag(count: number, capacity: number): void {
    this.bagEl.textContent = `${count}/${capacity}`;
    const frac = capacity > 0 ? count / capacity : 0;
    this.bagFillEl.style.width = `${Math.round(frac * 100)}%`;
    this.bagFillEl.style.background = frac >= 1 ? '#e2574c' : frac >= 0.7 ? '#f2c14e' : '#7ec850';
  }
  setObjective(text: string, chip = '🌽'): void {
    this.objectiveEl.textContent = text;
    this.objectiveChipEl.textContent = chip;
  }
  /** Farm level badge under the avatar, with the XP progress bar. */
  setLevel(level: number, fraction: number): void {
    this.root.querySelector<HTMLElement>('#level-txt')!.textContent = `Lv ${level}`;
    this.root.querySelector<HTMLElement>('#xp-fill')!.style.width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
  }
  /** Brief "Saved ✓" flash so players can see their farm is safe. */
  flashSaved(): void {
    const tag = this.root.querySelector<HTMLElement>('#saved-tag')!;
    tag.classList.remove('show');
    void tag.offsetWidth;
    tag.classList.add('show');
  }
  setHarvestReady(ready: boolean): void {
    this.harvestBtn.classList.toggle('ready', ready);
  }
  hideMenu(): void {
    this.menuEl.classList.add('hidden');
  }
  openPanel(title: string, bodyHtml: string): void {
    const wrap = this.root.querySelector<HTMLElement>('#panel-wrap')!;
    this.root.querySelector<HTMLElement>('#panel-title')!.textContent = title;
    this.root.querySelector<HTMLElement>('#panel-body')!.innerHTML = bodyHtml;
    wrap.classList.add('open');
  }
  closePanel(): void {
    this.root.querySelector<HTMLElement>('#panel-wrap')!.classList.remove('open');
  }
  get panelOpen(): boolean {
    return this.root.querySelector<HTMLElement>('#panel-wrap')!.classList.contains('open');
  }
}
