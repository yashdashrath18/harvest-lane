import { joystickVector, type JoystickVector } from '../utils/MathUtils';

/**
 * Player controls for the 3D game: a floating touch/mouse joystick
 * (DOM visuals) plus WASD and arrow keys for desktop. Pointer input
 * is joystick-only by design (Yash's change, 2026-10-31): tapping
 * the world does not move the farmer.
 */
export class Controls {
  vector: JoystickVector = { x: 0, y: 0, magnitude: 0 };
  private keys = new Set<string>();
  private pointerId: number | null = null;
  private origin = { x: 0, y: 0 };
  private baseEl: HTMLDivElement;
  private knobEl: HTMLDivElement;

  constructor(dom: HTMLElement) {
    this.baseEl = document.createElement('div');
    this.baseEl.id = 'joy-base';
    this.knobEl = document.createElement('div');
    this.knobEl.id = 'joy-knob';
    document.body.append(this.baseEl, this.knobEl);

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));

    dom.addEventListener('pointerdown', (e) => {
      if (this.pointerId !== null) return;
      this.pointerId = e.pointerId;
      // Capture the pointer so move/up keep arriving at the canvas
      // even when the finger slides over a HUD button. Without this,
      // the release can be lost and the joystick locks: the farmer
      // keeps the last vector (or none) and new touches are ignored
      // because pointerId never clears. Field bug, 2026-10-31.
      try {
        dom.setPointerCapture(e.pointerId);
      } catch {
        /* older browsers: the window-level release below still saves us */
      }
      this.origin = { x: e.clientX, y: e.clientY };
      this.baseEl.style.left = `${e.clientX}px`;
      this.baseEl.style.top = `${e.clientY}px`;
      this.knobEl.style.left = `${e.clientX}px`;
      this.knobEl.style.top = `${e.clientY}px`;
      this.baseEl.style.display = 'block';
      this.knobEl.style.display = 'block';
    });
    dom.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.pointerId) return;
      const dx = e.clientX - this.origin.x;
      const dy = e.clientY - this.origin.y;
      const v = joystickVector(dx, dy, 55);
      this.vector = v;
      this.knobEl.style.left = `${this.origin.x + v.x * 55 * v.magnitude}px`;
      this.knobEl.style.top = `${this.origin.y + v.y * 55 * v.magnitude}px`;
    });
    const release = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.vector = { x: 0, y: 0, magnitude: 0 };
      this.baseEl.style.display = 'none';
      this.knobEl.style.display = 'none';
    };
    dom.addEventListener('pointerup', release);
    dom.addEventListener('pointercancel', release);
    // Belt and braces: a release anywhere ends the drag.
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    // Losing focus mid-drag or mid-keypress must not strand input.
    window.addEventListener('blur', () => {
      this.keys.clear();
      if (this.pointerId !== null) {
        this.pointerId = null;
        this.vector = { x: 0, y: 0, magnitude: 0 };
        this.baseEl.style.display = 'none';
        this.knobEl.style.display = 'none';
      }
    });
  }

  /** Keyboard vector, or null when no key is held. */
  keyVector(): { x: number; z: number } | null {
    let x = 0;
    let z = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) z -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) z += 1;
    if (x === 0 && z === 0) return null;
    const len = Math.hypot(x, z);
    return { x: x / len, z: z / len };
  }

  get moving(): boolean {
    return this.vector.magnitude > 0.05 || this.keyVector() !== null;
  }
}
