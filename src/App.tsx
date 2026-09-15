import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";

import { initDb } from "./lib/db";
import { router } from "./router";
import "./App.css";

function App() {
  useEffect(() => {
    initDb().catch((error: unknown) => console.error("Database initialization failed:", error));
  }, []);

  return <RouterProvider router={router} />;
}

export default App;
