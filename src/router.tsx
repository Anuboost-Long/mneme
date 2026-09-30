import { createBrowserRouter } from "react-router-dom";

import RootLayout from "./layouts/RootLayout";
import AboutRoute from "./routes/AboutRoute";
import AgentChatRoute from "./routes/AgentChatRoute";
import CourseRoute from "./routes/CourseRoute";
import CoursesRoute from "./routes/CoursesRoute";
import HomeRoute from "./routes/HomeRoute";
import ModuleHighlightsRoute from "./routes/ModuleHighlightsRoute";
import ModuleRoute from "./routes/ModuleRoute";
import PageRoute from "./routes/PageRoute";
import RecordingsRoute from "./routes/RecordingsRoute";
import SettingsRoute from "./routes/SettingsRoute";

// Add new top-level routes as siblings of HomeRoute/AboutRoute here; nest
// under a parent route only when pages genuinely share layout beyond
// RootLayout. Each route here is a husk that wires router/store data into
// its feature's page component — see src/features/<feature>/pages.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: "courses", element: <CoursesRoute /> },
      { path: "courses/:courseId", element: <CourseRoute /> },
      { path: "courses/:courseId/modules/:moduleId", element: <ModuleRoute /> },
      {
        path: "courses/:courseId/modules/:moduleId/highlights",
        element: <ModuleHighlightsRoute />
      },
      { path: "courses/:courseId/modules/:moduleId/pages/:pageId", element: <PageRoute /> },
      { path: "settings", element: <SettingsRoute /> },
      { path: "settings/:section", element: <SettingsRoute /> },
      { path: "agent-chat", element: <AgentChatRoute /> },
      { path: "recordings", element: <RecordingsRoute /> },
      { path: "about", element: <AboutRoute /> }
    ]
  }
]);
