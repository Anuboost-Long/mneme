import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
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

  function selectTheme(selected: Theme) {
    localStorage.setItem("mneme.theme", selected);
    setTheme(selected);
  }

  return <ThemeContext.Provider value={{ theme, setTheme: selectTheme }}>{children}</ThemeContext.Provider>;
}
