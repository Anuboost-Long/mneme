import { useState } from "react";

function read(key: string): Set<number> {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "[]");
    return new Set(Array.isArray(saved) ? saved.filter((value) => typeof value === "number") : []);
  } catch {
    return new Set();
  }
}

// A set of ids kept on this device under `key`, like useStoredChoice for a
// single value. Changing `key` (another course, say) switches to its set.
export function useStoredSet(key: string) {
  const [state, setState] = useState(() => ({ key, values: read(key) }));
  const values = state.key === key ? state.values : read(key);

  function replace(next: Set<number>) {
    setState({ key, values: next });
    try {
      localStorage.setItem(key, JSON.stringify([...next]));
    } catch {
      return;
    }
  }

  function toggle(id: number) {
    const next = new Set(values);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    replace(next);
  }

  return { values, toggle, replace };
}
