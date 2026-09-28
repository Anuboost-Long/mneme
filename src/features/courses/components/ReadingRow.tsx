import clsx from "clsx";
import { Link } from "react-router-dom";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import { CompletionStatus, completionStatusLabels } from "../lib/completion-status";
import { pageContentPreview, PageType, type Page } from "../lib/pages";
import { pageTypeLabels } from "./PageForm";
import ItemMenu from "./ItemMenu";

const WORDS_PER_MINUTE = 220;

const typeGlyphs: Record<PageType, string> = {
  [PageType.Lesson]: "M12 6C10 4.5 7 4 4 4.5v14C7 18 10 18.5 12 20m0-14c2-1.5 5-2 8-1.5v14c-3-.5-6 0-8 1.5m0-14v14",
  [PageType.Lecture]: "M4 5h16v11H4zM9 20h6M12 16v4M10.5 8.5v4l3.5-2-3.5-2Z",
  [PageType.Exercise]: "m15 5 4 4M4 20l1-4L16 5l3 3-11 11-4 1Z",
  [PageType.Discussion]: "M4 5h16v10H9l-5 4V5Z",
  [PageType.Assignment]: "M9 4h6v3H9zM7 5.5H5v15h14v-15h-2M9 13l2 2 4-4",
  [PageType.Notes]: "M5 4h14v11l-5 5H5V4Zm9 16v-5h5M8 9h8M8 12h5",
  [PageType.Reading]: "M4 5h16M4 10h16M4 15h10M4 20h7",
  [PageType.Revision]: "M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4",
  [PageType.Custom]: "M12 3l9 9-9 9-9-9 9-9Z",
};

function readingTime(content: string | null) {
  const text = pageContentPreview(content);
  if (!text) return "Empty";
  return `${Math.max(1, Math.round(text.split(" ").length / WORDS_PER_MINUTE))} min`;
}

export default function ReadingRow({ page, to, onToggleDone, onEdit, onDelete, selectable, selected, onToggleSelect }: Readonly<{
  page: Page;
  to: string;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  selectable: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}>) {
  const completed = page.status === CompletionStatus.Completed;
  const preview = pageContentPreview(page.content);
  const title = <>
    <span className={clsx("block truncate text-sm font-medium")}>{page.title}</span>
    {preview && <BodyText as="span" tone="muted" className={clsx("mt-0.5 block truncate")}>{preview}</BodyText>}
  </>;

  return (
    <li className={clsx("relative flex items-center gap-4 rounded-md px-3 py-3", selected ? "bg-ink/7" : "hover:bg-ink/4")}>
      {selectable
        ? <label className={clsx("flex min-w-0 flex-1 cursor-pointer items-center gap-4", "after:absolute after:inset-0")}>
            <input type="checkbox" checked={selected} onChange={onToggleSelect} className={clsx("size-4 shrink-0 accent-chain-lime")} />
            <span className={clsx("min-w-0 flex-1")}>{title}</span>
          </label>
        : <>
            <label className={clsx("group/done relative z-10 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md", completed ? "bg-chain-lime text-chain-navy" : "bg-ink/6 text-muted hover:bg-ink/12 hover:text-ink", "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink")}>
              <input type="checkbox" checked={completed} onChange={onToggleDone} aria-label={`${page.title} done`} className={clsx("sr-only")} />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={clsx(!completed && "group-hover/done:hidden")}><path d={typeGlyphs[page.type]} /></svg>
              {!completed && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={clsx("hidden group-hover/done:block")}><path d="m5 12 5 5 9-10" /></svg>}
            </label>
            <Link to={to} className={clsx("min-w-0 flex-1", "after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ink")}>
              {title}
              <span className={clsx("sr-only")}>, {pageTypeLabels[page.type]}, {completionStatusLabels[page.status]}</span>
            </Link>
          </>}
      <div className={clsx("hidden shrink-0 text-right sm:block")}>
        <Caption as="span" className={clsx("block tabular-nums")}>{readingTime(page.content)}</Caption>
        <Caption as="span" tone="muted" className={clsx("block")}>{pageTypeLabels[page.type]}</Caption>
      </div>
      {!selectable && <ItemMenu label={page.title} onEdit={onEdit} onDelete={onDelete} />}
    </li>
  );
}
