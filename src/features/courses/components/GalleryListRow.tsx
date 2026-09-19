import clsx from "clsx";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { courseColors } from "../../../shared/ui/CourseIcon";
import { formatDate } from "../../../shared/lib/date";
import { BodyText, Caption, Typography } from "../../../shared/ui/Typography";

export default function GalleryListRow({ title, badge, description, color, to, createdAt, onEdit, onDelete, selectable = false, selected = false, onToggleSelect }: Readonly<{
  title: string;
  badge: string;
  description: string;
  color: string | null;
  to: string;
  createdAt: string;
  onEdit: () => void;
  onDelete: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}>) {
  const preview = description.replace(/\s+/g, " ").trim();

  return (
    <li
      className={clsx(
        "@container/list rounded-lg transition-colors motion-reduce:transition-none",
        selected ? "bg-action/10" : "bg-ink/3 hover:bg-ink/6 focus-within:bg-ink/6",
      )}
      style={{ "--course-color": color?.match(/^#[0-9a-f]{6}$/i) ? color : courseColors[0].value } as CSSProperties}
    >
      <div className={clsx("flex items-center gap-2 p-3 @min-2xl/list:gap-4 @min-2xl/list:px-4")}>
        {selectable && (
          <input type="checkbox" checked={selected} onChange={onToggleSelect} aria-label={`Select ${title}`} className={clsx("size-4 shrink-0 accent-action")} />
        )}
        <Link
          to={to}
          onClick={selectable ? (event) => { event.preventDefault(); onToggleSelect?.(); } : undefined}
          className={clsx(
            "grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-sm",
            "@min-2xl/list:grid-cols-[auto_minmax(0,1fr)_9rem] @min-2xl/list:gap-x-4",
            "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink",
          )}
        >
          <span aria-hidden="true" className={clsx("course-icon row-span-2 flex size-9 items-center justify-center rounded-md @min-2xl/list:row-span-1 @min-2xl/list:size-11")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>
          </span>
          <div className={clsx("min-w-0 py-1")}>
            <Typography as="span" variant="itemTitle" className={clsx("block leading-6 wrap-anywhere")}>{title}</Typography>
            {preview && <BodyText tone="muted" className={clsx("mt-0.5 line-clamp-1")}>{preview}</BodyText>}
          </div>
          <div className={clsx("col-start-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 @min-2xl/list:col-start-auto @min-2xl/list:flex-col @min-2xl/list:items-end")}>
            <Typography as="span" variant="caption" className={clsx("font-medium")}>{badge}</Typography>
            <Caption as="span" tone="muted">{formatDate(createdAt)}</Caption>
          </div>
        </Link>
        {!selectable && (
          <div className={clsx("flex shrink-0 flex-col gap-1 @min-2xl/list:flex-row")}>
            <button type="button" aria-label={`Edit ${title}`} title="Edit" onClick={onEdit} className={clsx("flex size-8 items-center justify-center rounded-md", "bg-ink/5 text-muted", "hover:bg-ink/10 hover:text-ink")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z" /></svg>
            </button>
            <button type="button" aria-label={`Delete ${title}`} title="Delete" onClick={onDelete} className={clsx("flex size-8 items-center justify-center rounded-md", "bg-ink/5 text-muted", "hover:bg-danger/10 hover:text-danger")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 14h12l1-14M10 10v6M14 10v6" /></svg>
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
