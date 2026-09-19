import { useState } from "react";

export function useStoredChoice<T extends string>(key: string, values: readonly T[], fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return values.find((option) => option === saved) ?? fallback;
    } catch {
      return fallback;
    }
  });

  function choose(next: T) {
    setValue(next);
    try { localStorage.setItem(key, next); } catch { return; }
  }

  return [value, choose] as const;
}
