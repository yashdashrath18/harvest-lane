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
  private levelUpEl: HTMLDivElement;
  private levelUpShownAt = 0;
  onHarvest: (() => void) | null = null;
  onOpenShop: (() => void) | null = null;
  onOpenMissions: (() => void) | null = null;
  onOpenSettings: (() => void) | null = null;
  onLevelTap: (() => void) | null = null;
  onPillCoins: (() => void) | null = null;
  onSeedHint: (() => void) | null = null;
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
      <div class="level-badge clickable" id="btn-level"><span id="level-txt">Lv 1</span><div class="xp-track"><div class="xp-fill" id="xp-fill"></div></div><div class="xp-num" id="xp-num">0/50</div></div>
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
        <button class="obj-missions clickable" id="btn-missions">MISSIONS <span>›</span></button>
      </div>
      <div class="bag-pill">
        <div class="row"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 8V7a6 6 0 0 1 12 0v1h3v13H3V8zm2 0h8V7a4 4 0 0 0-8 0z" fill="#fdf3da"/></svg><span id="bag">0/10</span></div>
        <div class="bar"><div class="fill" id="bag-fill"></div></div>
      </div>
      <div class="stock-chip" id="stock-chip" style="display:none">Stall empty</div>
      <div class="seed-pill" id="seed-pill">🌱 Seeds 30/30</div>
      <button class="seed-hint clickable" id="seed-hint" style="display:none">Out of seeds, tap to buy 🌱</button>
      <div class="hint">Drag the joystick to move, or use WASD</div>
      <button class="harvest-btn clickable" id="btn-harvest">HARVEST</button>
      <div id="levelup" class="hidden">
        <div class="lu-card">
          <div class="lu-title" id="lu-title">⭐ LEVEL 2!</div>
          <div class="lu-rewards" id="lu-rewards"></div>
          <div class="lu-unlocks" id="lu-unlocks"></div>
          <button class="lu-btn clickable" id="lu-continue">Continue</button>
        </div>
      </div>
      <div id="menu">
        <div class="logo">
          <svg class="sprout" viewBox="0 0 48 32"><path d="M24 30 C24 20 24 14 24 8" stroke="#3d8a28" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M24 12 C16 12 10 7 9 1 C17 2 23 5 24 12z" fill="#57b93c"/><path d="M24 9 C31 9 37 5 39 0 C32 -0.5 25 3 24 9z" fill="#7ec850" transform="translate(1.5,1)"/></svg>
          <h1>HARVEST<br/>LANE 3D</h1>
        </div>
        <div class="sub">Grow it. Harvest it. Sell it.</div>
        <button class="play" id="btn-play">▶ PLAY</button>
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
    this.levelUpEl = $('levelup') as HTMLDivElement;
    $('btn-play').addEventListener('click', () => this.onPlay?.());
    this.harvestBtn.addEventListener('click', () => this.onHarvest?.());
    $('btn-shop').addEventListener('click', () => this.onOpenShop?.());
    $('plus-coins').addEventListener('click', () => this.onOpenShop?.());
    $('btn-missions').addEventListener('click', () => this.onOpenMissions?.());
    $('plus-gems').addEventListener('click', () => this.onOpenMissions?.());
    $('btn-settings').addEventListener('click', () => this.onOpenSettings?.());
    $('btn-level').addEventListener('click', () => this.onLevelTap?.());
    $('seed-hint').addEventListener('click', () => this.onSeedHint?.());
    $('lu-continue').addEventListener('click', () => this.hideLevelUp());
    this.levelUpEl.addEventListener('click', () => {
      if (Date.now() - this.levelUpShownAt > 600) this.hideLevelUp();
    });
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
  /** Farm level badge under the avatar, with the XP progress bar and count. */
  setLevel(level: number, fraction: number, xpText?: string): void {
    this.root.querySelector<HTMLElement>('#level-txt')!.textContent = `Lv ${level}`;
    const fill = this.root.querySelector<HTMLElement>('#xp-fill')!;
    fill.style.transition = 'width 0.4s ease-out';
    fill.style.width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
    if (xpText) this.root.querySelector<HTMLElement>('#xp-num')!.textContent = xpText;
    const track = this.root.querySelector<HTMLElement>('.xp-track')!;
    track.classList.remove('pulse');
    void track.offsetWidth;
    track.classList.add('pulse');
  }
  /** Bounce the level badge (level-up feedback). */
  bumpLevel(): void {
    const badge = this.root.querySelector<HTMLElement>('#btn-level')!;
    badge.classList.remove('bump');
    void badge.offsetWidth;
    badge.classList.add('bump');
  }
  /** Slide-in LEVEL UP panel: rewards and whatever the level unlocked. */
  showLevelUp(level: number, rewardsText: string, unlockLabels: string[]): void {
    this.root.querySelector<HTMLElement>('#lu-title')!.textContent = `⭐ LEVEL ${level}!`;
    this.root.querySelector<HTMLElement>('#lu-rewards')!.textContent = rewardsText;
    const unlocks = this.root.querySelector<HTMLElement>('#lu-unlocks')!;
    unlocks.innerHTML = unlockLabels.length
      ? unlockLabels.map((u) => `<div class="lu-unlock">🔓 Unlocked: ${u}</div>`).join('')
      : '';
    this.levelUpShownAt = Date.now();
    this.levelUpEl.classList.remove('hidden');
    requestAnimationFrame(() => this.levelUpEl.classList.add('show'));
  }
  hideLevelUp(): void {
    this.levelUpEl.classList.remove('show');
    this.levelUpEl.classList.add('hidden');
  }
  /** Seed bag readout above the backpack pill (master prompt S2). */
  setSeeds(text: string): void {
    this.root.querySelector<HTMLElement>('#seed-pill')!.textContent = text;
  }
  /** Shows or hides the tappable out-of-seeds hint above the stock bar. */
  showSeedHint(cropLabel: string | null): void {
    const el = this.root.querySelector<HTMLElement>('#seed-hint')!;
    if (!cropLabel) {
      el.style.display = 'none';
      return;
    }
    el.textContent = `Out of ${cropLabel} seeds, tap to buy 🌱`;
    el.style.display = 'block';
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
