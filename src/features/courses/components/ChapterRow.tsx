import {
  completionStatusLabels,
  type CompletionStatus
} from "@/features/courses/lib/completion-status";
import type { Module } from "@/features/courses/lib/module/types";
import type { PageProgress } from "@/features/courses/lib/page/types";
import CourseIcon from "@/shared/ui/CourseIcon";
import { BodyText, Caption } from "@/shared/ui/Typography";
import clsx from "clsx";
import type { ReactNode, Ref } from "react";
import { Link } from "react-router-dom";

import ItemMenu from "./ItemMenu";
import StatusPicker, { statusMarkerStyles } from "./StatusPicker";

function pagesLabel(progress: PageProgress | undefined) {
  if (!progress?.total) return "No pages yet";
  return `${progress.done} of ${progress.total} ${progress.total === 1 ? "page" : "pages"} done`;
}

// `handle` is the drag grip, when the list can be reordered; `children` is
// what shows under the module while it's expanded (its pages).
export default function ChapterRow({
  ref,
  module,
  courseColor,
  number,
  progress,
  upNext,
  rail,
  to,
  handle,
  expanded,
  onToggleExpanded,
  onStatusChange,
  onEdit,
  onDelete,
  dragging = false,
  children
}: Readonly<{
  ref?: Ref<HTMLLIElement>;
  module: Module;
  courseColor: string | null;
  number: number;
  progress: PageProgress | undefined;
  upNext: boolean;
  rail: boolean;
  to: string;
  handle?: ReactNode;
  expanded: boolean;
  onToggleExpanded: () => void;
  onStatusChange: (status: CompletionStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
  dragging?: boolean;
  children?: ReactNode;
}>) {
  const pagesId = `module-${module.id}-pages`;
  return (
    <li
      ref={ref}
      className={clsx(
        "group relative flex items-start gap-4 py-4",
        dragging && "z-20 rounded-lg bg-surface shadow-lg"
      )}
    >
      {rail && (
        <span
          aria-hidden="true"
          className={clsx(
            "absolute top-16 -bottom-2 w-px bg-ink/15",
            handle ? "left-13" : "left-5",
            "group-last:hidden"
          )}
        />
      )}
      {handle && <span className={clsx("relative z-10 mt-1 -mr-2 shrink-0")}>{handle}</span>}
      <StatusPicker
        status={module.status}
        itemLabel={`Module ${number}, ${module.name}`}
        onChange={onStatusChange}
        triggerClassName={clsx(
          "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
          statusMarkerStyles[module.status],
          "hover:ring-4 hover:ring-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        )}
      >
        {String(number).padStart(2, "0")}
      </StatusPicker>
      <div className={clsx("min-w-0 flex-1 pt-2")}>
        <Link
          to={to}
          className={clsx(
            "flex items-center gap-2 text-base font-medium wrap-anywhere",
            "after:absolute after:inset-0 after:rounded-md",
            "hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ink"
          )}
        >
          {module.icon && <CourseIcon icon={module.icon} color={courseColor} />}
          <span className={clsx("min-w-0")}>
            <span className={clsx("sr-only")}>Module {number}: </span>
            {module.name}
            <span className={clsx("sr-only")}>, {completionStatusLabels[module.status]}</span>
          </span>
        </Link>
        {module.description && (
          <BodyText tone="muted" className={clsx("mt-1 line-clamp-2 wrap-anywhere")}>
            {module.description}
          </BodyText>
        )}
        {expanded && children}
      </div>
      <div className={clsx("flex shrink-0 items-center gap-3 pt-1.5")}>
        <div className={clsx("hidden text-right sm:block")}>
          <Caption as="span" tone={upNext ? "text" : "muted"} className={clsx("block font-medium")}>
            {upNext ? "Up next" : completionStatusLabels[module.status]}
          </Caption>
          <Caption as="span" tone="muted" className={clsx("block")}>
            {pagesLabel(progress)}
          </Caption>
        </div>
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls={expanded ? pagesId : undefined}
          aria-label={`${expanded ? "Hide" : "Show"} pages in ${module.name}`}
          title={expanded ? "Hide pages" : "Show pages"}
          className={clsx(
            "relative z-10 flex size-8 items-center justify-center rounded-md",
            "text-muted",
            "hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
          )}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={clsx("motion-safe:transition-transform", expanded && "rotate-180")}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <ItemMenu label={module.name} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </li>
  );
}
