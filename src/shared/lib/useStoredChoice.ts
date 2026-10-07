import { useEffect, useState } from "react";

const STORED_CHANGE = "mneme:stored-change";

function readStored(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function useStoredString(key: string, fallback: string) {
  const [value, setValue] = useState(() => readStored(key, fallback));

  useEffect(() => {
    function sync(event: Event) {
      if ((event as CustomEvent<string>).detail === key) setValue(readStored(key, fallback));
    }
    window.addEventListener(STORED_CHANGE, sync);
    return () => window.removeEventListener(STORED_CHANGE, sync);
  }, [key, fallback]);

  function choose(next: string) {
    setValue(next);
    try { localStorage.setItem(key, next); } catch { return; }
    window.dispatchEvent(new CustomEvent(STORED_CHANGE, { detail: key }));
  }

  return [value, choose] as const;
}

export function useStoredChoice<T extends string>(key: string, values: readonly T[], fallback: T) {
  const [stored, choose] = useStoredString(key, fallback);
  const value = values.find((option) => option === stored) ?? fallback;
  return [value, choose as (next: T) => void] as const;
}
