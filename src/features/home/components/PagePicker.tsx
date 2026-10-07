import { searchPageLinks } from "@/features/courses/lib/page/actions";
import { getPages } from "@/features/home/lib/dashboard/actions";
import { useWidgetData } from "@/features/home/lib/useWidgetData";
import { Caption, Typography } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState } from "react";

export type PageTarget = {
  id: number;
  title: string;
  module_id: number;
  course_id: number;
  where: string;
};

export default function PagePicker({
  selected,
  onSelect
}: Readonly<{ selected: PageTarget | null; onSelect: (page: PageTarget | null) => void }>) {
  const [query, setQuery] = useState("");
  const matches = useWidgetData(async (): Promise<PageTarget[]> => {
    if (query.trim()) {
      const pages = await searchPageLinks(query, 8);
      return pages.map((page) => ({
        id: page.id,
        title: page.title,
        module_id: page.module_id,
        course_id: page.course_id,
        where: page.module_name
      }));
    }
    const recent = await getPages({}, "opened", 6);
    return recent.map((page) => ({
      id: page.id,
      title: page.title,
      module_id: page.module_id,
      course_id: page.course_id,
      where: `${page.course_name} · ${page.module_name}`
    }));
  }, query);

  useEffect(() => {
    if (!selected && !query.trim() && matches?.[0]) onSelect(matches[0]);
  }, [matches]);

  return (
    <fieldset className={clsx("min-w-0 space-y-2")}>
      <legend>
        <Typography as="span" variant="label">
          Page
        </Typography>
      </legend>
      <input
        type="search"
        value={query}
        placeholder="Search pages…"
        aria-label="Search pages"
        onChange={(event) => {
          setQuery(event.target.value);
          onSelect(null);
        }}
        className={clsx(
          "h-9 w-full rounded-md",
          "border border-ink/20 bg-surface",
          "px-3 text-sm placeholder:text-muted",
          "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
        )}
      />
      {!query.trim() && <Caption tone="muted">Recently opened</Caption>}
      <ul className={clsx("max-h-64 space-y-0.5 overflow-y-auto")}>
        {matches?.length === 0 && (
          <li className={clsx("px-3 py-2 text-sm text-muted")}>No pages match.</li>
        )}
        {matches?.map((page) => {
          const isSelected = selected?.id === page.id;
          return (
            <li key={page.id}>
              <label
                aria-label={`${page.title}, ${page.where}`}
                className={clsx(
                  "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2",
                  isSelected ? "bg-ink/7" : "hover:bg-ink/4",
                  "has-focus-visible:outline-1 has-focus-visible:-outline-offset-1 has-focus-visible:outline-ink"
                )}
              >
                <input
                  type="radio"
                  name="page-picker"
                  checked={isSelected}
                  onChange={() => onSelect(page)}
                  className={clsx("sr-only")}
                />
                <span className={clsx("min-w-0 flex-1")}>
                  <span className={clsx("block truncate text-sm font-medium")}>{page.title}</span>
                  <Caption as="span" tone="muted" className={clsx("block truncate")}>
                    {page.where}
                  </Caption>
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={clsx("shrink-0", !isSelected && "invisible")}
                >
                  <path d="m3.5 8.5 3 3 6-7" />
                </svg>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
