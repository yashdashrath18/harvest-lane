export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** True when (x, y) is within `threshold` of (targetX, targetY). */
export function hasArrivedWithin(
  x: number,
  y: number,
  targetX: number,
  targetY: number,
  threshold: number,
): boolean {
  return distance(x, y, targetX, targetY) <= threshold;
}

export interface JoystickVector {
  /** Analogue direction including magnitude: components in [-1, 1]. */
  x: number;
  y: number;
  /** 0 at rest, 1 at or beyond the joystick radius. */
  magnitude: number;
}

/**
 * Converts a joystick drag offset (dx, dy in pixels from the base
 * centre) into an analogue movement vector. Inside the radius the
 * magnitude grows proportionally (fine speed control); beyond it the
 * vector clamps to full speed in that direction.
 */
export function joystickVector(dx: number, dy: number, radius: number): JoystickVector {
  const len = Math.hypot(dx, dy);
  if (len === 0 || radius <= 0) return { x: 0, y: 0, magnitude: 0 };
  const magnitude = Math.min(1, len / radius);
  return {
    x: (dx / len) * magnitude,
    y: (dy / len) * magnitude,
    magnitude,
  };
}
