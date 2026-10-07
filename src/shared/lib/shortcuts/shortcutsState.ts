import { atom, useAtom, useAtomValue } from "jotai";
import { useEffect, useRef } from "react";

import { getShortcutOverrides, saveShortcutOverrides } from "./actions";
import { comboFromEvent, defaultBindings, type Bindings, type ShortcutId } from "./types";

const overridesAtom = atom<Partial<Bindings>>({});
const bindingsAtom = atom((get) => ({ ...defaultBindings, ...get(overridesAtom) }));

function without(overrides: Partial<Bindings>, id: ShortcutId) {
  const next = { ...overrides };
  delete next[id];
  return next;
}

export function useShortcuts() {
  const [overrides, setOverrides] = useAtom(overridesAtom);
  const bindings = useAtomValue(bindingsAtom);

  async function save(next: Partial<Bindings>) {
    const previous = overrides;
    setOverrides(next);
    try {
      await saveShortcutOverrides(next);
    } catch (error) {
      setOverrides(previous);
      throw error;
    }
  }

  function change(id: ShortcutId, combo: string) {
    const rest = without(overrides, id);
    return save(combo === defaultBindings[id] ? rest : { ...rest, [id]: combo });
  }

  function reset(id: ShortcutId) {
    return save(without(overrides, id));
  }

  async function load() {
    setOverrides(await getShortcutOverrides());
  }

  return { bindings, overrides, change, reset, resetAll: () => save({}), load };
}

export function useShortcut(id: ShortcutId, run: (event: KeyboardEvent) => void, enabled = true) {
  const combo = useAtomValue(bindingsAtom)[id];
  const latest = useRef(run);

  useEffect(() => {
    latest.current = run;
  });

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent) {
      if (comboFromEvent(event) !== combo) return;
      event.preventDefault();
      latest.current(event);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [combo, enabled]);
}
