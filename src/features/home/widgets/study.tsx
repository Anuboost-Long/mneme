import clsx from "clsx";
import { Link } from "react-router-dom";

import { timeAgo } from "../../../shared/lib/date";
import { formatDuration } from "../../../shared/lib/formatDuration";
import { Caption } from "../../../shared/ui/Typography";
import { CompletionStatus } from "../../courses/lib/completion-status";
import type { PageType } from "../../courses/lib/pages";
import { getPages, getRecentHighlights, getRecentRecordings, type PageFilter, type PageSort } from "../lib/dashboard";
import { useWidgetData } from "../lib/useWidgetData";
import { PageGlyph, pageLink, RowLink, Rows, rowsFor, WidgetNote } from "./parts";
import type { WidgetProps } from "./types";

export function pageFilter(config: Record<string, unknown>): PageFilter {
  return {
    courseId: Number(config.courseId) || undefined,
    type: (Number(config.type) || undefined) as PageType | undefined,
    status: (Number(config.status) || undefined) as CompletionStatus | undefined
  };
}

export function ContinueWidget({ widget }: Readonly<WidgetProps>) {
  const [page] = useWidgetData(() => getPages({}, "opened", 1), "continue") ?? [];
  if (!page) return <WidgetNote>The page you open last shows up here.</WidgetNote>;
  const compact = widget.size === "small";
  return (
    <div className={clsx("flex h-full gap-3 px-3 pb-3", compact ? "flex-col justify-end" : "items-end")}>
      <div className={clsx("min-w-0 flex-1")}>
        <PageGlyph page={page} />
        <p className={clsx("mt-2 truncate text-sm font-medium")}>{page.title}</p>
        <Caption tone="muted" className={clsx("truncate")}>
          {page.course_name} · {timeAgo(page.seen_at)}
        </Caption>
      </div>
      <Link
        to={pageLink(page)}
        className={clsx("inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md", "bg-chain-lime text-chain-navy", "px-3 text-sm font-semibold", "hover:bg-chain-lime/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink")}
      >
        Continue
      </Link>
    </div>
  );
}

// Recent pages, pages needing revision and your own page lists are all
// this list, with different filters and sorting.
export function PageListWidget({ widget }: Readonly<WidgetProps>) {
  const filter = pageFilter(widget.config);
  const sort = (widget.config.sort as PageSort | undefined) ?? "opened";
  const limit = rowsFor(widget.size);
  const pages = useWidgetData(() => getPages(filter, sort, limit), JSON.stringify([filter, sort, limit]));
  if (!pages) return null;
  if (pages.length === 0) return <WidgetNote>No pages match yet.</WidgetNote>;
  const narrow = widget.size === "small";
  return (
    <Rows>
      {pages.map((page) => (
        <RowLink key={page.id} to={pageLink(page)}>
          <PageGlyph page={page} />
          <span className={clsx("min-w-0 flex-1 truncate font-medium")}>{page.title}</span>
          {!narrow && <Caption as="span" tone="muted" className={clsx("hidden max-w-48 truncate @md:block")}>{page.course_name} · {page.module_name}</Caption>}
          {!narrow && sort !== "title" && <Caption as="span" tone="muted" className={clsx("w-24 shrink-0 text-right")}>{timeAgo(page.seen_at)}</Caption>}
        </RowLink>
      ))}
    </Rows>
  );
}

// Latest recordings; `refreshKey` reloads it after a new one is filed.
export function RecordingsList({ limit, refreshKey = 0 }: Readonly<{ limit: number; refreshKey?: number }>) {
  const recordings = useWidgetData(() => getRecentRecordings(limit), `${limit}-${refreshKey}`);
  if (!recordings) return null;
  if (recordings.length === 0) return <WidgetNote>Recordings you make on pages show up here.</WidgetNote>;
  return (
    <Rows>
      {recordings.map((recording) => (
        <RowLink key={recording.id} to={pageLink({ id: recording.page_id, module_id: recording.module_id, course_id: recording.course_id })}>
          <svg className={clsx("size-4 shrink-0 text-muted")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
          <span className={clsx("min-w-0 flex-1 truncate")}>
            <span className={clsx("font-medium")}>{recording.name}</span>
            <span className={clsx("text-muted")}> · {recording.page_title}</span>
          </span>
          <Caption as="span" tone="muted" className={clsx("shrink-0 tabular-nums")}>{formatDuration(recording.duration_ms)}</Caption>
        </RowLink>
      ))}
    </Rows>
  );
}

function plainText(html: string) {
  return new DOMParser().parseFromString(html, "text/html").body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

export function HighlightsWidget({ widget }: Readonly<WidgetProps>) {
  const limit = widget.size === "large" ? 6 : 2;
  const highlights = useWidgetData(() => getRecentHighlights(limit), String(limit));
  if (!highlights) return null;
  if (highlights.length === 0) return <WidgetNote>Text you highlight on pages shows up here.</WidgetNote>;
  return (
    <ul className={clsx("space-y-1 px-1.5")}>
      {highlights.map((highlight) => (
        <li key={highlight.id}>
          <Link to={pageLink({ id: highlight.page_id, module_id: highlight.module_id, course_id: highlight.course_id })} className={clsx("block rounded-md px-1.5 py-1", "hover:bg-ink/4 focus-visible:bg-ink/4 focus-visible:outline-none")}>
            <p className={clsx("line-clamp-2 text-sm")}>
              <mark className={clsx("rounded-sm bg-chain-lime/45 text-inherit")}>{plainText(highlight.html)}</mark>
            </p>
            <Caption tone="muted" className={clsx("truncate")}>{highlight.page_title}</Caption>
          </Link>
        </li>
      ))}
    </ul>
  );
}
