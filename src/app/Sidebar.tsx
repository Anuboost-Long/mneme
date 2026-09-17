import clsx from "clsx";
import { NavLink } from "react-router-dom";
import type { Course } from "../features/courses/lib/courses";
import type { SidebarMode } from "../shared/providers/SidebarModeProvider";
import CourseIcon from "../shared/ui/CourseIcon";
import CourseActions from "../features/courses/components/CourseActions";
import { Caption } from "../shared/ui/Typography";

function SidebarLinks({ courses, ready, onCreate, onSave, onDelete }: Readonly<{
  courses: Course[];
  ready: boolean;
  onCreate: () => void;
  onSave: (course: Course) => void;
  onDelete: (id: number) => void;
}>) {
  return (
    <>
      <NavLink to="/" end className={({ isActive }) => clsx("mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium", isActive ? "bg-ink/7" : "hover:bg-ink/5")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></svg>
        Home
      </NavLink>
      <NavLink to="/courses" end className={({ isActive }) => clsx("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium", isActive ? "bg-ink/7" : "hover:bg-ink/5")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 4h7v7H3zM14 4h7v7h-7zM3 15h7v6H3zM14 15h7v6h-7z" /></svg>
        All courses
      </NavLink>
      <div className={clsx("mt-6 flex items-center justify-between px-3")}>
        <Caption as="h2" tone="muted">Courses</Caption>
        <Caption as="span" tone="muted">{ready ? courses.length : ""}</Caption>
      </div>
      <nav aria-label="Courses" className={clsx("mt-2 min-h-0 flex-1 overflow-y-auto")}>
        {courses.map((course) => (
          <CourseActions key={course.id} course={course} onSave={onSave} onDelete={onDelete}>
            <NavLink to={`/courses/${course.id}`} className={({ isActive }) => clsx("mb-1 flex items-center gap-2 rounded-md py-1.5 pr-12 pl-2 text-sm", isActive ? "bg-ink/7 font-medium" : "hover:bg-ink/5")}>
              <CourseIcon icon={course.icon} color={course.color} />
              <span className={clsx("truncate")} title={course.name}>{course.name}</span>
            </NavLink>
          </CourseActions>
        ))}
      </nav>
      <button type="button" onClick={onCreate} disabled={!ready} className={clsx("mt-2 flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-muted", "hover:bg-ink/5")}>
        <span aria-hidden="true" className={clsx("text-xl leading-none")}>+</span> New course
      </button>
      <NavLink to="/settings" className={({ isActive }) => clsx("mt-4 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm", isActive ? "bg-ink/7 font-medium" : "text-muted hover:bg-ink/5")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" fill="var(--sidebar)" /><circle cx="15" cy="17" r="3" fill="var(--sidebar)" /></svg>
        Settings
      </NavLink>
    </>
  );
}

export default function Sidebar({ mode, expanded, instant, courses, ready, onCreate, onSave, onDelete }: Readonly<{
  mode: SidebarMode;
  expanded: boolean;
  instant: boolean;
  courses: Course[];
  ready: boolean;
  onCreate: () => void;
  onSave: (course: Course) => void;
  onDelete: (id: number) => void;
}>) {
  const links = <SidebarLinks courses={courses} ready={ready} onCreate={onCreate} onSave={onSave} onDelete={onDelete} />;

  if (mode === "push") {
    return (
      <aside id="workspace-sidebar" aria-label="Workspace" aria-hidden={!expanded} inert={!expanded} data-expanded={expanded} data-instant={instant} className={clsx("sidebar-push grid max-h-[70vh] shrink-0 bg-sidebar sm:h-[calc(100vh-4rem)] sm:max-h-none")}>
        <div className={clsx("flex min-h-0")}>
          <div className={clsx("sidebar-push-content relative z-10 flex min-h-0 min-w-0 flex-1 flex-col sm:w-60 sm:shrink-0 sm:flex-none", "bg-sidebar border-b border-ink/10 sm:border-r sm:border-b-0", "p-4")}>
            {links}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside id="workspace-sidebar" aria-label="Workspace" aria-hidden={!expanded} inert={!expanded} data-expanded={expanded} data-instant={instant} className={clsx("sidebar-overlay fixed top-16 bottom-0 left-0 z-30 flex w-60 flex-col overflow-hidden", "bg-sidebar shadow-lg", "border-r border-ink/10", "p-4")}>
      {links}
    </aside>
  );
}
