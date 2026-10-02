import clsx from "clsx";
import { useAtom, useSetAtom } from "jotai";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation, useMatch, useNavigate } from "react-router-dom";

import CommandPalette from "../app/CommandPalette";
import NavBar from "../app/NavBar";
import Sidebar from "../app/Sidebar";
import AgentChatPanel from "../features/agent-chat/components/AgentChatPanel";
import { cleanUpConversations } from "../features/agent-chat/lib/conversation/actions";
import ApprovalPrompt from "../features/agent-server/components/ApprovalPrompt";
import CourseForm from "../features/courses/components/CourseForm";
import { getCourses } from "../features/courses/lib/course/actions";
import { coursesAtom, creatingCourseAtom, useCourses } from "../features/courses/lib/coursesState";
import { storeInlineIcons } from "../features/courses/lib/icon/actions";
import { storeInlinePageImages } from "../features/courses/lib/page/actions";
import { unloadVoiceWhenIdle } from "../features/read-aloud/lib/downloadedVoicePlayer";
import { purgeExpiredItems } from "../features/recently-deleted/lib/deleted-item/actions";
import { initDb } from "../shared/lib/db";
import { useSidebarMode } from "../shared/providers/SidebarModeProvider";
import { BodyText, PageTitle } from "../shared/ui/Typography";

export default function RootLayout() {
  const { courses, save, remove, reorder } = useCourses();
  const setCourses = useSetAtom(coursesAtom);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [creating, setCreating] = useAtom(creatingCourseAtom);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try {
      return localStorage.getItem("mneme.sidebar.collapsed") !== "true";
    } catch {
      return true;
    }
  });
  const [sidebarInstant, setSidebarInstant] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(() => {
    try {
      return localStorage.getItem("mneme.ai-panel.open") === "true";
    } catch {
      return false;
    }
  });
  const chatRoute = useMatch("/agent-chat") !== null;
  const openPage = useMatch("/courses/:courseId/modules/:moduleId/pages/:pageId");
  const { sidebarMode } = useSidebarMode();
  const navigate = useNavigate();
  const settingsRoute = useMatch("/settings/*") !== null;
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  const previousSidebarMode = useRef(sidebarMode);
  const content = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (previousSidebarMode.current === sidebarMode) return;
    previousSidebarMode.current = sidebarMode;
    setSidebarInstant(true);
    setSidebarExpanded(false);
    try {
      localStorage.setItem("mneme.sidebar.collapsed", "true");
    } catch {}
  }, [sidebarMode]);

  useEffect(() => {
    if (!sidebarInstant) return;
    const frame = requestAnimationFrame(() => setSidebarInstant(false));
    return () => cancelAnimationFrame(frame);
  }, [sidebarInstant]);

  useLayoutEffect(() => {
    const from = previousPath.current;
    previousPath.current = pathname;
    const betweenSettingsSections =
      from.startsWith("/settings") && pathname.startsWith("/settings");
    if (
      from === pathname ||
      betweenSettingsSections ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const animation = content.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 160,
      easing: "ease-out"
    });
    return () => animation?.cancel();
  }, [pathname]);

  useEffect(unloadVoiceWhenIdle, []);

  useEffect(() => {
    let active = true;
    initDb()
      .then(cleanUpConversations)
      .then(purgeExpiredItems)
      .then(() => {
        void storeInlinePageImages().catch(() => undefined);
        void storeInlineIcons().catch(() => undefined);
        return getCourses();
      })
      .then((loaded) => {
        if (active) {
          setCourses(loaded);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  function toggleSidebar() {
    setSidebarExpanded(!sidebarExpanded);
    try {
      localStorage.setItem("mneme.sidebar.collapsed", String(sidebarExpanded));
    } catch {}
  }

  function toggleAiPanel() {
    setAiPanelOpen(!aiPanelOpen);
    try {
      localStorage.setItem("mneme.ai-panel.open", String(!aiPanelOpen));
    } catch {}
  }

  function collapseOverlayOnContentClick() {
    if (sidebarInstant || sidebarMode !== "overlay" || !sidebarExpanded) return;
    setSidebarExpanded(false);
    try {
      localStorage.setItem("mneme.sidebar.collapsed", "true");
    } catch {}
  }

  return (
    <div className={clsx("flex h-screen flex-col overflow-hidden bg-surface text-ink")}>
      <a href="#main-content" className={clsx("sr-only focus:not-sr-only focus:p-3")}>
        Skip to content
      </a>
      <NavBar
        sidebarExpanded={sidebarExpanded}
        onToggleSidebar={toggleSidebar}
        aiPanelOpen={aiPanelOpen}
        onToggleAiPanel={chatRoute ? undefined : toggleAiPanel}
      />
      <div className={clsx("relative flex min-h-0 flex-1 flex-col sm:flex-row")}>
        <Sidebar
          mode={sidebarMode}
          expanded={sidebarExpanded}
          instant={sidebarInstant}
          courses={courses}
          ready={status === "ready"}
          onCreate={() => setCreating(true)}
          onSave={save}
          onDelete={remove}
          onReorder={reorder}
        />
        <main
          ref={content}
          id="main-content"
          onClick={collapseOverlayOnContentClick}
          className={clsx("flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto")}
        >
          {!settingsRoute && status === "loading" && (
            <BodyText role="status" tone="muted" className={clsx("p-8")}>
              Opening your workspace…
            </BodyText>
          )}
          {!settingsRoute && status === "error" && (
            <section className={clsx("mx-auto max-w-lg p-8 pt-20")}>
              <PageTitle>Couldn’t open your courses</PageTitle>
              <BodyText role="alert" tone="muted" className={clsx("mt-3")}>
                Local storage isn’t available. Open Mneme in the desktop app, then try again.
              </BodyText>
              <button
                type="button"
                onClick={() => {
                  setStatus("loading");
                  setAttempt((value) => value + 1);
                }}
                className={clsx("mt-6 rounded-md bg-action px-4 py-2 text-sm text-on-action")}
              >
                Try again
              </button>
            </section>
          )}
          {(status === "ready" || settingsRoute) && <Outlet />}
        </main>
        {!chatRoute && (
          <div
            inert={!aiPanelOpen}
            className={clsx(
              "absolute inset-y-0 right-0 z-30 w-full sm:w-80 lg:w-96",
              "shadow-xl",
              "motion-safe:transition-[translate,opacity] motion-safe:duration-200 motion-safe:ease-out",
              aiPanelOpen
                ? "translate-x-0 opacity-100"
                : "pointer-events-none translate-x-full opacity-0"
            )}
          >
            <AgentChatPanel
              pageId={openPage ? Number(openPage.params.pageId) : null}
              onClose={toggleAiPanel}
            />
          </div>
        )}
      </div>
      {creating && (
        <CourseForm
          onClose={() => setCreating(false)}
          onSave={(course) => {
            save(course);
            setCreating(false);
            navigate(`/courses/${course.id}`);
          }}
        />
      )}
      <ApprovalPrompt />
      <CommandPalette courses={courses} />
    </div>
  );
}
