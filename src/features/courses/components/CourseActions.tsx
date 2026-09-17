import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMatch, useNavigate } from "react-router-dom";
import clsx from "clsx";
import type { Course } from "../lib/courses";
import CourseForm from "./CourseForm";
import DeleteCourse from "./DeleteCourse";

export default function CourseActions({ course, onSave, onDelete, children }: Readonly<{
  course: Course;
  onSave: (course: Course) => void;
  onDelete: (id: number) => void;
  children: ReactNode;
}>) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const menu = useRef<HTMLMenuElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const id = useId();
  const navigate = useNavigate();
  const currentCourse = useMatch("/courses/:courseId");

  useLayoutEffect(() => {
    if (!position || !menu.current) return;
    const element = menu.current;
    const bounds = element.getBoundingClientRect();
    element.style.left = `${Math.max(8, Math.min(position.x, window.innerWidth - bounds.width - 8))}px`;
    element.style.top = `${Math.max(8, Math.min(position.y, window.innerHeight - bounds.height - 8))}px`;
    element.querySelector<HTMLButtonElement>("button")?.focus();
    function dismiss(event: Event) {
      if (event.target instanceof Node && (element.contains(event.target) || trigger.current?.contains(event.target))) return;
      setPosition(null);
    }
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [position]);

  function closeMenu() {
    setPosition(null);
    returnFocus.current?.focus();
  }

  return (
    <div className={clsx("relative")} onContextMenu={(event) => {
      if (event.target instanceof Element && event.target.closest("dialog")) return;
      event.preventDefault();
      returnFocus.current = event.target instanceof Element ? event.target.closest<HTMLElement>("a, button") : trigger.current;
      const bounds = event.currentTarget.getBoundingClientRect();
      setPosition({ x: event.clientX || bounds.left, y: event.clientY || bounds.bottom });
    }} onKeyDown={(event) => {
      if (event.target instanceof Element && event.target.closest("dialog")) return;
      if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
      event.preventDefault();
      returnFocus.current = event.target as HTMLElement;
      const bounds = event.currentTarget.getBoundingClientRect();
      setPosition({ x: bounds.left, y: bounds.bottom });
    }}>
      {children}
      <button ref={trigger} type="button" aria-label={`Actions for ${course.name}`} aria-haspopup="menu" aria-expanded={position !== null} aria-controls={position ? id : undefined} onClick={(event) => {
        if (position) { closeMenu(); return; }
        returnFocus.current = event.currentTarget;
        const bounds = event.currentTarget.getBoundingClientRect();
        setPosition({ x: bounds.right - 208, y: bounds.bottom + 4 });
      }} className={clsx("absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md", "text-muted", "hover:bg-ink/10 hover:text-ink focus-visible:text-ink")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
      </button>
      {position && createPortal(
        <menu ref={menu} id={id} role="menu" aria-label={`Actions for ${course.name}`} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }} onKeyDown={(event) => {
          event.stopPropagation();
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
          const index = items.indexOf(document.activeElement as HTMLButtonElement);
          switch (event.key) {
            case "ArrowDown": event.preventDefault(); items[(index + 1) % items.length]?.focus(); break;
            case "ArrowUp": event.preventDefault(); items[(index + items.length - 1) % items.length]?.focus(); break;
            case "Home": event.preventDefault(); items[0]?.focus(); break;
            case "End": event.preventDefault(); items[items.length - 1]?.focus(); break;
            case "Escape": event.preventDefault(); closeMenu(); break;
            case "Tab": closeMenu(); break;
            default: {
              if (event.key.length === 1) items.find((item) => item.textContent?.toLowerCase().startsWith(event.key.toLowerCase()))?.focus();
            }
          }
        }} className={clsx("fixed z-50 m-0 w-52 max-w-11/12 list-none rounded-lg", "bg-surface border border-ink/20 shadow-lg", "p-1 text-sm text-ink")} style={{ left: position.x, top: position.y }}>
          {([
            { label: "Open", path: "M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v2M3 7v12a2 2 0 0 0 2 2h14l3-11H7L5 21", action: () => navigate(`/courses/${course.id}`) },
            { label: "Edit", path: "m16 3 5 5M4 20l4-1L21 6a2 2 0 0 0-5-3L3 16l-1 5 5-1", action: () => setDialog("edit") },
            { label: "Delete", path: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7", action: () => setDialog("delete") },
          ] as const).map((item) => (
            <li key={item.label} role="none" className={clsx(item.label === "Delete" && "mt-1 border-t border-ink/10 pt-1")}>
              <button type="button" role="menuitem" tabIndex={-1} onClick={() => { closeMenu(); item.action(); }} className={clsx("flex w-full items-center gap-3 rounded-md", "px-3 py-2 text-left", "focus-visible:outline-none", item.label === "Delete" ? "text-danger hover:bg-danger/10 focus-visible:bg-danger/10" : "hover:bg-ink/7 focus-visible:bg-ink/7")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.path} /></svg>
                {item.label}
              </button>
            </li>
          ))}
        </menu>, document.body,
      )}
      {dialog === "edit" && <CourseForm course={course} onClose={() => setDialog(null)} onSave={(updated) => { onSave(updated); setDialog(null); }} />}
      {dialog === "delete" && <DeleteCourse course={course} onClose={() => setDialog(null)} onDelete={() => {
        onDelete(course.id);
        setDialog(null);
        if (currentCourse?.params.courseId === String(course.id)) navigate("/courses", { replace: true });
      }} />}
    </div>
  );
}
