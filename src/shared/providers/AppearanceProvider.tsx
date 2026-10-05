import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";

import { applyAppearance, readAppearance, saveAppearance, type Appearance } from "../lib/appearance";

type AppearanceContext = { appearance: Appearance; changeAppearance: (changes: Partial<Appearance>) => void };
const AppearanceContext = createContext<AppearanceContext | null>(null);

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance requires AppearanceProvider.");
  return context;
}

export default function AppearanceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [appearance, setAppearance] = useState(readAppearance);

  useLayoutEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  function changeAppearance(changes: Partial<Appearance>) {
    const next = { ...appearance, ...changes };
    saveAppearance(next);
    setAppearance(next);
  }

  return <AppearanceContext.Provider value={{ appearance, changeAppearance }}>{children}</AppearanceContext.Provider>;
}
