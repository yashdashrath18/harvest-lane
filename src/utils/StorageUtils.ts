const KEY = 'harvest-lane-save';

export function saveLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${KEY}:${key}`, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode, quotas). The standalone
    // game must keep running without saves in that case.
  }
}

export function loadLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${KEY}:${key}`);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}
