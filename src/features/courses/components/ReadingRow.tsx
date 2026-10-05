import clsx from "clsx";
import type { ReactNode, Ref } from "react";
import { Link } from "react-router-dom";
import CourseIcon from "../../../shared/ui/CourseIcon";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import { CompletionStatus, completionStatusLabels } from "../lib/completion-status";
import { pageContentPreview } from "../lib/page/types";
import { pageTypeLabel } from "../lib/page-type/pageTypesState";
import ItemMenu from "./ItemMenu";
import { pageMeta, readingTime, typeGlyph, type PageItemProps } from "./pageDisplay";

// `handle` is the drag grip, when the list can be reordered.
export default function ReadingRow({ ref, page, courseColor, to, handle, dragging = false, onToggleDone, onEdit, onDelete, actions, selectable, selected, onToggleSelect }: Readonly<PageItemProps & {
  ref?: Ref<HTMLLIElement>;
  handle?: ReactNode;
  dragging?: boolean;
}>) {
  const completed = page.status === CompletionStatus.Completed;
  const preview = pageContentPreview(page.content);
  const title = <>
    <span className={clsx("flex items-center gap-2 text-sm font-medium")}>
      {page.icon && <CourseIcon icon={page.icon} color={courseColor} />}
      <span className={clsx("min-w-0 truncate")}>{page.title}</span>
    </span>
    {preview && <BodyText as="span" tone="muted" className={clsx("mt-0.5 block truncate")}>{preview}</BodyText>}
  </>;

  return (
    <li ref={ref} className={clsx("relative flex items-center gap-4 rounded-md px-3 py-3", selected ? "bg-ink/7" : "hover:bg-ink/4", dragging && "z-10 bg-surface shadow-lg")}>
      {handle && <span className={clsx("relative z-10 -mr-2 shrink-0")}>{handle}</span>}
      {selectable
        ? <label className={clsx("flex min-w-0 flex-1 cursor-pointer items-center gap-4", "after:absolute after:inset-0")}>
            <input type="checkbox" checked={selected} onChange={onToggleSelect} className={clsx("size-4 shrink-0 accent-accent")} />
            <span className={clsx("min-w-0 flex-1")}>{title}</span>
          </label>
        : <>
            <label className={clsx("group/done relative z-10 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md", completed ? "bg-accent text-chain-navy" : "bg-ink/6 text-muted hover:bg-ink/12 hover:text-ink", "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink")}>
              <input type="checkbox" checked={completed} onChange={onToggleDone} aria-label={`${page.title} done`} className={clsx("sr-only")} />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={clsx(!completed && "group-hover/done:hidden")}><path d={typeGlyph(page.type)} /></svg>
              {!completed && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={clsx("hidden group-hover/done:block")}><path d="m5 12 5 5 9-10" /></svg>}
            </label>
            <Link to={to} className={clsx("min-w-0 flex-1", "after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ink")}>
              {title}
              <span className={clsx("sr-only")}>, {pageTypeLabel(page.type)}, {completionStatusLabels[page.status]}</span>
            </Link>
          </>}
      <div className={clsx("hidden shrink-0 text-right sm:block")}>
        <Caption as="span" className={clsx("block tabular-nums")}>{readingTime(page.content)}</Caption>
        <Caption as="span" tone="muted" className={clsx("block")}>
          {pageMeta(page)}
        </Caption>
      </div>
      {!selectable && <ItemMenu label={page.title} onEdit={onEdit} onDelete={onDelete} actions={actions} />}
    </li>
  );
}
