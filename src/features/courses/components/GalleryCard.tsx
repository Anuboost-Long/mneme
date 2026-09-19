import clsx from "clsx";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { courseColors } from "../../../shared/ui/CourseIcon";
import { formatDate } from "../../../shared/lib/date";
import { BodyText, Caption, Typography } from "../../../shared/ui/Typography";

export default function GalleryCard({ title, badge, description, color, to, openLabel, createdAt, onEdit, onDelete, selectable = false, selected = false, onToggleSelect }: Readonly<{
  title: string;
  badge: string;
  description: string;
  color: string | null;
  to: string;
  openLabel: string;
  createdAt: string;
  onEdit: () => void;
  onDelete: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}>) {
  return (
    <li
      className={clsx(
        "gallery-card group relative flex min-w-0 flex-col overflow-hidden rounded-lg bg-surface",
        selected ? "border-2 border-action" : "border border-ink/15 hover:border-ink/35 focus-within:border-ink/35",
      )}
      style={{ "--gallery-color": color?.match(/^#[0-9a-f]{6}$/i) ? color : courseColors[0].value } as CSSProperties}
    >
      <Link
        to={to}
        onClick={selectable ? (event) => { event.preventDefault(); onToggleSelect?.(); } : undefined}
        className={clsx("flex min-w-0 flex-1 flex-col", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink")}
      >
        <div className={clsx("gallery-card-header flex min-h-16 items-center justify-between gap-3 px-5 py-3")}>
          {selectable ? (
            <input type="checkbox" checked={selected} readOnly aria-label={`Select ${title}`} className={clsx("size-5 shrink-0 rounded border-ink/30")} />
          ) : (
            <span className={clsx("flex size-10 shrink-0 items-center justify-center rounded-md border border-current text-ink/25")}>
              <svg className={clsx("size-5")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1m0-15c3-2 7-2 9-1v15c-3-1-6-1-9 1V5Z" />
              </svg>
            </span>
          )}
          <Typography as="span" variant="caption" className={clsx("shrink-0 rounded-full border border-ink/25 px-3 py-0.5 text-sm font-normal tracking-wide")}>{badge}</Typography>
        </div>
        <div className={clsx("flex flex-1 flex-col px-5 pb-4 pt-4")}>
          <Typography as="h3" variant="itemTitle" className={clsx("text-lg font-semibold tracking-tight wrap-anywhere")}>{title}</Typography>
          <BodyText tone="muted" className={clsx("mt-2 line-clamp-3 min-h-15 whitespace-pre-wrap wrap-anywhere")}>{description}</BodyText>
          <Caption tone="muted" className={clsx("mt-3")}>{formatDate(createdAt)}</Caption>
        </div>
        <span className={clsx("mx-5 flex items-center justify-between gap-2 border-t border-ink/10 py-3 text-sm font-medium text-ink")}>
          {selectable ? (selected ? "Selected" : "Select") : openLabel}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={clsx("transition-transform motion-reduce:transition-none", "group-hover:translate-x-1 group-focus-within:translate-x-1 motion-reduce:transform-none")}><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
        </span>
      </Link>
      {!selectable && (
        <div className={clsx("flex items-center justify-end gap-2", "bg-sidebar/50 border-t border-ink/10", "px-4 py-3")}>
          <button type="button" aria-label={`Edit ${title}`} title="Edit" onClick={onEdit} className={clsx("flex size-9 items-center justify-center rounded-md", "bg-surface border border-ink/20", "text-ink", "hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-ink")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z" /></svg>
          </button>
          <button type="button" aria-label={`Delete ${title}`} title="Delete" onClick={onDelete} className={clsx("flex size-9 items-center justify-center rounded-md", "bg-danger/10", "text-danger", "hover:bg-danger/15 focus-visible:outline-2 focus-visible:outline-danger")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 14h12l1-14M10 10v6M14 10v6" /></svg>
          </button>
        </div>
      )}
    </li>
  );
}
