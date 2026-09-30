import clsx from "clsx";
import { NavLink } from "react-router-dom";
import { pinnedFirst, withGroupOrder, type Course } from "../features/courses/lib/courses";
import { useDragReorder } from "../shared/lib/useDragReorder";
import DragHandle from "../shared/ui/DragHandle";
import type { SidebarMode } from "../shared/providers/SidebarModeProvider";
import TruncatedText from "../shared/ui/TruncatedText";
import CourseIcon from "../shared/ui/CourseIcon";
import CourseActions from "../features/courses/components/CourseActions";
import { Caption } from "../shared/ui/Typography";

type CourseHandlers = {
  onSave: (course: Course) => void;
  onDelete: (id: number) => void;
  onReorder: (courses: Course[]) => void;
};

// One group (pinned or not); dragging reorders within it. The grip covers
// the course icon while the row is hovered or focused.
function CourseLinks({ group, courses, onSave, onDelete, onReorder }: Readonly<CourseHandlers & { group: Course[]; courses: Course[] }>) {
  const reorderable = useDragReorder(group, (next) => onReorder(withGroupOrder(courses, next)));
  return reorderable.items.map((course, index) => (
    <div
      key={course.id}
      ref={reorderable.itemRef(course.id)}
      className={clsx("group/row relative", reorderable.draggingId === course.id && "z-10 rounded-md bg-sidebar shadow-lg")}
    >
      <DragHandle
        name={course.name}
        {...reorderable.handleProps(course.id, index)}
        className={clsx(
          "absolute top-1/2 left-1 z-10 -translate-y-1/2",
          "opacity-0",
          "group-hover/row:opacity-100 group-focus-within/row:opacity-100"
        )}
      />
      <CourseActions course={course} onSave={onSave} onDelete={onDelete}>
        <NavLink to={`/courses/${course.id}`} className={({ isActive }) => clsx("mb-1 flex items-center gap-2 rounded-md py-1.5 pr-12 pl-2 text-sm", isActive ? "bg-ink/7 font-medium" : "hover:bg-ink/5")}>
          <span className={clsx("flex group-hover/row:opacity-0 group-focus-within/row:opacity-0")}>
            <CourseIcon icon={course.icon} color={course.color} />
          </span>
          <TruncatedText text={course.name} className={clsx("min-w-0 flex-1")} />
        </NavLink>
      </CourseActions>
    </div>
  ));
}

function SidebarLinks({ courses, ready, onCreate, ...handlers }: Readonly<CourseHandlers & {
  courses: Course[];
  ready: boolean;
  onCreate: () => void;
}>) {
  const { pinned, others } = pinnedFirst(courses);
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
      <NavLink to="/agent-chat" className={({ isActive }) => clsx("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium", isActive ? "bg-ink/7" : "hover:bg-ink/5")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11a8 8 0 0 1-8 8H7l-4 3V11a9 9 0 0 1 18 0Z" /></svg>
        Chat
      </NavLink>
      <NavLink to="/recordings" className={({ isActive }) => clsx("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium", isActive ? "bg-ink/7" : "hover:bg-ink/5")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
        Recordings
      </NavLink>
      <div className={clsx("mt-6 flex items-center justify-between px-3")}>
        <Caption as="h2" tone="muted">Courses</Caption>
        <Caption as="span" tone="muted">{ready ? courses.length : ""}</Caption>
      </div>
      <nav aria-label="Courses" className={clsx("mt-2 min-h-0 flex-1 overflow-y-auto")}>
        {pinned.length > 0 && (
          <>
            <Caption as="h3" tone="muted" className={clsx("px-2 pt-1 pb-1")}>Pinned</Caption>
            <CourseLinks group={pinned} courses={courses} {...handlers} />
            <div aria-hidden="true" className={clsx("mx-2 my-2 border-t border-ink/10")} />
          </>
        )}
        <CourseLinks group={others} courses={courses} {...handlers} />
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

export default function Sidebar({ mode, expanded, instant, courses, ready, onCreate, onSave, onDelete, onReorder }: Readonly<CourseHandlers & {
  mode: SidebarMode;
  expanded: boolean;
  instant: boolean;
  courses: Course[];
  ready: boolean;
  onCreate: () => void;
}>) {
  const links = <SidebarLinks courses={courses} ready={ready} onCreate={onCreate} onSave={onSave} onDelete={onDelete} onReorder={onReorder} />;

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
