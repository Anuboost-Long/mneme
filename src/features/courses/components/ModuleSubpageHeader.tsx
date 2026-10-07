import clsx from "clsx";
import { Fragment } from "react";
import { Link } from "react-router-dom";

import type { Course } from "@/features/courses/lib/course/types";
import type { Module } from "@/features/courses/lib/module/types";

export type Crumb = { label: string; to?: string };

// The back button and breadcrumb of a screen inside a module (flashcards,
// quizzes). `trail` follows the module; its last crumb is the current screen.
export default function ModuleSubpageHeader({
  course,
  module,
  trail
}: Readonly<{ course: Course; module: Module; trail: Crumb[] }>) {
  const modulePath = `/courses/${course.id}/modules/${module.id}`;
  const parent = trail[trail.length - 2];
  const back = parent?.to ? { to: parent.to, label: `Back to ${parent.label.toLowerCase()}` } : { to: modulePath, label: `Back to ${module.name}` };
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
        <Link to={modulePath} className={clsx("min-w-0 truncate hover:text-ink")}>
          {module.name}
        </Link>
        {trail.map((crumb, index) => (
          <Fragment key={crumb.label}>
            <span aria-hidden="true">/</span>
            {index === trail.length - 1 || !crumb.to ? (
              <span aria-current={index === trail.length - 1 ? "page" : undefined} className={clsx("min-w-0 truncate")}>
                {crumb.label}
              </span>
            ) : (
              <Link to={crumb.to} className={clsx("shrink-0 hover:text-ink")}>
                {crumb.label}
              </Link>
            )}
          </Fragment>
        ))}
      </nav>
    </>
  );
}
