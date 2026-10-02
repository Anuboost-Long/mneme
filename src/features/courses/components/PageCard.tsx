import clsx from "clsx";
import type { CSSProperties, ReactNode, Ref } from "react";
import { Link } from "react-router-dom";

import { useFileUrl } from "../../../shared/lib/useFileUrl";
import CourseIcon, { courseColors } from "../../../shared/ui/CourseIcon";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import { CompletionStatus, completionStatusLabels } from "../lib/completion-status";
import { pageContentPreview } from "../lib/page/types";
import ItemMenu from "./ItemMenu";
import { pageMeta, readingTime, typeGlyphs, type PageItemProps } from "./pageDisplay";
import { pageTypeLabels } from "./PageForm";

// A page in the gallery view: its cover (or icon) above its title.
// `handle` is the drag grip, when the gallery can be reordered.
export default function PageCard({ ref, page, courseColor, to, handle, dragging = false, onToggleDone, onEdit, onDelete, actions, selectable, selected, onToggleSelect }: Readonly<PageItemProps & {
  ref?: Ref<HTMLLIElement>;
  handle?: ReactNode;
  dragging?: boolean;
}>) {
  const coverUrl = useFileUrl(page.cover);
  const completed = page.status === CompletionStatus.Completed;
  const preview = pageContentPreview(page.content);
  const tint = { "--course-color": courseColor?.match(/^#[0-9a-f]{6}$/i) ? courseColor : courseColors[0].value } as CSSProperties;

  return (
    <li
      ref={ref}
      className={clsx(
        "group relative flex flex-col overflow-hidden rounded-lg",
        "border",
        selected ? "border-ink/40 bg-ink/5" : "border-ink/10 bg-surface hover:border-ink/25",
        dragging && "z-10 shadow-lg"
      )}
    >
      <div className={clsx("relative aspect-video w-full")} style={tint}>
        {coverUrl ? (
          <img src={coverUrl} alt="" className={clsx("size-full object-cover")} />
        ) : (
          <div className={clsx("flex size-full items-center justify-center", "bg-(--course-color)/10 text-(--course-color)")}>
            {page.icon ? (
              <CourseIcon icon={page.icon} color={courseColor} large />
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={typeGlyphs[page.type]} />
              </svg>
            )}
          </div>
        )}
        {handle && <span className={clsx("absolute top-2 right-2 z-10 rounded-md bg-surface/90")}>{handle}</span>}
        {!selectable && (
          <label
            className={clsx(
              "absolute top-2 left-2 z-10 flex size-8 cursor-pointer items-center justify-center rounded-md",
              completed ? "bg-chain-lime text-chain-navy" : "bg-surface/90 text-muted hover:text-ink",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
            )}
          >
            <input type="checkbox" checked={completed} onChange={onToggleDone} aria-label={`${page.title} done`} className={clsx("sr-only")} />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 5 5 9-10" />
            </svg>
          </label>
        )}
      </div>
      <div className={clsx("flex min-h-0 flex-1 flex-col gap-1 p-3")}>
        {selectable ? (
          <label className={clsx("flex cursor-pointer items-start gap-2", "after:absolute after:inset-0")}>
            <input type="checkbox" checked={selected} onChange={onToggleSelect} className={clsx("mt-1 size-4 shrink-0 accent-chain-lime")} />
            <span className={clsx("line-clamp-2 text-sm font-medium")}>{page.title}</span>
          </label>
        ) : (
          <Link
            to={to}
            className={clsx(
              "line-clamp-2 text-sm font-medium",
              "after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ink"
            )}
          >
            {page.title}
            <span className={clsx("sr-only")}>, {pageTypeLabels[page.type]}, {completionStatusLabels[page.status]}</span>
          </Link>
        )}
        {preview && <BodyText tone="muted" className={clsx("line-clamp-2")}>{preview}</BodyText>}
        <div className={clsx("mt-auto flex items-center gap-2 pt-2")}>
          <Caption as="span" tone="muted" className={clsx("min-w-0 flex-1 truncate")}>{pageMeta(page)}</Caption>
          <Caption as="span" tone="muted" className={clsx("shrink-0 tabular-nums")}>{readingTime(page.content)}</Caption>
          {!selectable && <ItemMenu label={page.title} onEdit={onEdit} onDelete={onDelete} actions={actions} />}
        </div>
      </div>
    </li>
  );
}
