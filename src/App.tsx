import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import AppearanceProvider from "./shared/providers/AppearanceProvider";
import ThemeProvider from "./shared/providers/ThemeProvider";
import SidebarModeProvider from "./shared/providers/SidebarModeProvider";

import { router } from "./router";
import "./App.css";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.matches("input, textarea, select");
}

function App() {
  useEffect(() => {
    function guardBackspaceNavigation(event: KeyboardEvent) {
      if (event.key !== "Backspace" || isEditableTarget(event.target)) return;
      event.preventDefault();
    }
    window.addEventListener("keydown", guardBackspaceNavigation);
    return () => window.removeEventListener("keydown", guardBackspaceNavigation);
  }, []);

  return <ThemeProvider><AppearanceProvider><SidebarModeProvider><RouterProvider router={router} /></SidebarModeProvider></AppearanceProvider></ThemeProvider>;
}

export default App;
