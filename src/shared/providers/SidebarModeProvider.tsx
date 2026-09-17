import { createContext, useContext, useState, type ReactNode } from "react";

export type SidebarMode = "overlay" | "push";
type SidebarModeContext = { sidebarMode: SidebarMode; setSidebarMode: (mode: SidebarMode) => void };
const SidebarModeContext = createContext<SidebarModeContext | null>(null);

export function useSidebarMode() {
  const context = useContext(SidebarModeContext);
  if (!context) throw new Error("useSidebarMode requires SidebarModeProvider.");
  return context;
}

export default function SidebarModeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [sidebarMode, setMode] = useState<SidebarMode>(() => {
    try { return localStorage.getItem("mneme.sidebar.mode") === "push" ? "push" : "overlay"; }
    catch { return "overlay"; }
  });

  function setSidebarMode(mode: SidebarMode) {
    setMode(mode);
    try { localStorage.setItem("mneme.sidebar.mode", mode); }
    catch {}
  }

  return <SidebarModeContext.Provider value={{ sidebarMode, setSidebarMode }}>{children}</SidebarModeContext.Provider>;
}
