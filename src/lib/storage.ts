const isBrowser = typeof window !== "undefined";

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getLocalStorageItem<T>(key: string, fallback: T): T {
  if (!isBrowser) {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  return safeJsonParse(raw, fallback);
}

export function setLocalStorageItem<T>(key: string, value: T): void {
  if (!isBrowser) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function seedIfEmpty<T>(key: string, seedValue: T): T {
  if (!isBrowser) {
    return seedValue;
  }

  const existing = window.localStorage.getItem(key);
  if (existing) {
    return safeJsonParse(existing, seedValue);
  }

  setLocalStorageItem(key, seedValue);
  return seedValue;
}
