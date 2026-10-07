import { desktop } from "@chain/sdk";
import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

const windowBackgrounds: Record<Theme, string> = { light: "#ffffff", dark: "#171b24" };
type ThemeContext = { theme: Theme; setTheme: (theme: Theme) => void };
const ThemeContext = createContext<ThemeContext | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme requires ThemeProvider.");
  return context;
}

export default function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === "dark" ? "dark" : "light");

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    void desktop.window.setOptions({ appearance: theme, backgroundColor: windowBackgrounds[theme] }).catch(() => undefined);
  }, [theme]);

  function selectTheme(selected: Theme) {
    localStorage.setItem("mneme.theme", selected);
    setTheme(selected);
  }

  return <ThemeContext.Provider value={{ theme, setTheme: selectTheme }}>{children}</ThemeContext.Provider>;
}
