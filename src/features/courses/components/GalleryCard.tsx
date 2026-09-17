import clsx from "clsx";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { courseColors } from "../../../shared/ui/CourseIcon";
import { BodyText, Typography } from "../../../shared/ui/Typography";

export default function GalleryCard({ title, badge, description, color, to, openLabel, onEdit, onDelete }: Readonly<{
  title: string;
  badge: string;
  description: string;
  color: string | null;
  to: string;
  openLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}>) {
  return (
    <li
      className={clsx("gallery-card group relative flex min-w-0 flex-col overflow-hidden rounded-lg", "border border-ink/15 bg-surface", "hover:border-ink/35 focus-within:border-ink/35")}
      style={{ "--gallery-color": color?.match(/^#[0-9a-f]{6}$/i) ? color : courseColors[0].value } as CSSProperties}
    >
      <Link to={to} className={clsx("flex min-w-0 flex-1 flex-col", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink")}>
        <div className={clsx("gallery-card-header flex min-h-16 items-center justify-between gap-3 px-5 py-3")}>
          <span className={clsx("flex size-10 shrink-0 items-center justify-center rounded-md border border-current text-ink/25")}>
            <svg className={clsx("size-5")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1m0-15c3-2 7-2 9-1v15c-3-1-6-1-9 1V5Z" />
            </svg>
          </span>
          <Typography as="span" variant="caption" className={clsx("shrink-0 rounded-full border border-ink/25 px-3 py-0.5 text-sm font-normal tracking-wide")}>{badge}</Typography>
        </div>
        <div className={clsx("flex flex-1 flex-col px-5 pb-4 pt-4")}>
          <Typography as="h3" variant="itemTitle" className={clsx("text-lg font-semibold tracking-tight wrap-anywhere")}>{title}</Typography>
          <BodyText tone="muted" className={clsx("mt-2 line-clamp-3 min-h-15 whitespace-pre-wrap wrap-anywhere")}>{description}</BodyText>
        </div>
        <span className={clsx("mx-5 flex items-center justify-between gap-2 border-t border-ink/10 py-3 text-sm font-medium text-ink")}>
          {openLabel}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={clsx("transition-transform motion-reduce:transition-none", "group-hover:translate-x-1 group-focus-within:translate-x-1 motion-reduce:transform-none")}><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
        </span>
      </Link>
      <div className={clsx("flex items-center justify-end gap-1 border-t border-ink/10 bg-sidebar/50 px-3 py-1.5")}>
        <button type="button" aria-label={`Edit ${title}`} onClick={onEdit} className={clsx("rounded-md px-3 py-1.5 text-sm text-muted", "hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink")}>Edit</button>
        <button type="button" aria-label={`Delete ${title}`} onClick={onDelete} className={clsx("rounded-md px-3 py-1.5 text-sm text-muted", "hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-danger")}>Delete</button>
      </div>
    </li>
  );
}
