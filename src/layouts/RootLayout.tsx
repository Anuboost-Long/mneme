import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation, useMatch, useNavigate, useOutletContext } from "react-router-dom";
import clsx from "clsx";
import { BodyText, PageTitle } from "../shared/ui/Typography";
import NavBar from "../app/NavBar";
import Sidebar from "../app/Sidebar";
import CourseForm from "../features/courses/components/CourseForm";
import { useSidebarMode } from "../shared/providers/SidebarModeProvider";
import { getCourses, type Course } from "../features/courses/lib/courses";
import { initDb } from "../shared/lib/db";

type CoursesContext = {
  courses: Course[];
  create: () => void;
  save: (course: Course) => void;
  remove: (id: number) => void;
};

export function useCourses() {
  return useOutletContext<CoursesContext>();
}

export default function RootLayout() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [creating, setCreating] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try { return localStorage.getItem("mneme.sidebar.collapsed") !== "true"; }
    catch { return true; }
  });
  const [sidebarInstant, setSidebarInstant] = useState(false);
  const { sidebarMode } = useSidebarMode();
  const navigate = useNavigate();
  const settingsRoute = useMatch("/settings") !== null;
  const homeRoute = useMatch("/") !== null;
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  const previousSidebarMode = useRef(sidebarMode);
  const workspace = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (previousSidebarMode.current === sidebarMode) return;
    previousSidebarMode.current = sidebarMode;
    setSidebarInstant(true);
    setSidebarExpanded(false);
    try { localStorage.setItem("mneme.sidebar.collapsed", "true"); }
    catch {}
  }, [sidebarMode]);

  useEffect(() => {
    if (!sidebarInstant) return;
    const frame = requestAnimationFrame(() => setSidebarInstant(false));
    return () => cancelAnimationFrame(frame);
  }, [sidebarInstant]);

  useLayoutEffect(() => {
    const from = previousPath.current;
    previousPath.current = pathname;
    if (from === pathname || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const surface = from === "/" || pathname === "/" ? workspace.current : content.current;
    const animation = surface?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 160,
      easing: "ease-out",
    });
    return () => animation?.cancel();
  }, [pathname]);

  useEffect(() => {
    let active = true;
    initDb().then(() => getCourses()).then((loaded) => {
      if (active) { setCourses(loaded); setStatus("ready"); }
    }).catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, [attempt]);

  function save(course: Course) {
    setCourses((current) => current.some((item) => item.id === course.id)
      ? current.map((item) => item.id === course.id ? course : item)
      : [...current, course]);
  }

  function remove(id: number) {
    setCourses((current) => current.filter((course) => course.id !== id));
  }

  function toggleSidebar() {
    setSidebarExpanded(!sidebarExpanded);
    try { localStorage.setItem("mneme.sidebar.collapsed", String(sidebarExpanded)); }
    catch {}
  }

  function collapseOverlayOnContentClick() {
    if (sidebarInstant || sidebarMode !== "overlay" || !sidebarExpanded) return;
    setSidebarExpanded(false);
    try { localStorage.setItem("mneme.sidebar.collapsed", "true"); }
    catch {}
  }

  return (
    <div className={clsx("flex h-screen flex-col overflow-hidden bg-surface text-ink")}>
      <a href="#main-content" className={clsx("sr-only focus:not-sr-only focus:p-3")}>Skip to content</a>
      <NavBar sidebarExpanded={sidebarExpanded} onToggleSidebar={homeRoute ? undefined : toggleSidebar} />
      <div ref={workspace} className={clsx("flex min-h-0 flex-1 flex-col sm:flex-row")}>
        {!homeRoute && <Sidebar mode={sidebarMode} expanded={sidebarExpanded} instant={sidebarInstant} courses={courses} ready={status === "ready"} onCreate={() => setCreating(true)} onSave={save} onDelete={remove} />}
        <main ref={content} id="main-content" onClick={collapseOverlayOnContentClick} className={clsx("flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto")}>
          {!settingsRoute && status === "loading" && <BodyText role="status" tone="muted" className={clsx("p-8")}>Opening your workspace…</BodyText>}
          {!settingsRoute && status === "error" && (
            <section className={clsx("mx-auto max-w-lg p-8 pt-20")}>
              <PageTitle>Couldn’t open your courses</PageTitle>
              <BodyText role="alert" tone="muted" className={clsx("mt-3")}>Local storage isn’t available. Open Mneme in the desktop app, then try again.</BodyText>
              <button type="button" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }} className={clsx("mt-6 rounded-md bg-action px-4 py-2 text-sm text-on-action")}>Try again</button>
            </section>
          )}
          {(status === "ready" || settingsRoute) && <Outlet context={{ courses, create: () => setCreating(true), save, remove } satisfies CoursesContext} />}
        </main>
      </div>
      {creating && <CourseForm onClose={() => setCreating(false)} onSave={(course) => { save(course); setCreating(false); navigate(`/courses/${course.id}`); }} />}
    </div>
  );
}
