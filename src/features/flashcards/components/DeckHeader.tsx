import clsx from "clsx";
import { Link } from "react-router-dom";

import type { Course } from "../../courses/lib/course/types";
import type { Module } from "../../courses/lib/module/types";

export default function DeckHeader({
  course,
  module,
  current
}: Readonly<{ course: Course; module: Module; current: "Flashcards" | "Study" }>) {
  const deck = `/courses/${course.id}/modules/${module.id}/flashcards`;
  const back = current === "Study" ? { to: deck, label: "Back to flashcards" } : { to: `/courses/${course.id}/modules/${module.id}`, label: `Back to ${module.name}` };
  return (
    <>
      <Link
        to={back.to}
        className={clsx(
          "inline-flex items-center gap-2 rounded-md",
          "border border-ink/15",
          "px-3 py-2 text-sm font-medium",
          "hover:bg-ink/5"
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m12 5-7 7 7 7M5 12h14" />
        </svg>
        <span className={clsx("truncate")}>{back.label}</span>
      </Link>
      <nav aria-label="Breadcrumb" className={clsx("mt-4 flex items-center gap-3 text-xs text-muted")}>
        <Link to="/courses" className={clsx("shrink-0 hover:text-ink")}>
          Your courses
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/courses/${course.id}`} className={clsx("min-w-0 truncate hover:text-ink")}>
          {course.name}
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/courses/${course.id}/modules/${module.id}`} className={clsx("min-w-0 truncate hover:text-ink")}>
          {module.name}
        </Link>
        <span aria-hidden="true">/</span>
        {current === "Study" ? (
          <>
            <Link to={deck} className={clsx("shrink-0 hover:text-ink")}>
              Flashcards
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Study</span>
          </>
        ) : (
          <span aria-current="page">Flashcards</span>
        )}
      </nav>
    </>
  );
}
