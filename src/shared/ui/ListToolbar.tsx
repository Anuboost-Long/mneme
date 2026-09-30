import { useId, useState } from "react";
import clsx from "clsx";
import type { DateGroupBy } from "../lib/dateGroups";
import Select from "./Select";

export type ToolbarOption = { value: string; label: string };

export const DATE_GROUP_OPTIONS: { value: DateGroupBy; label: string }[] = [
  { value: "none", label: "Don’t group" },
  { value: "day", label: "By day" },
  { value: "week", label: "By week" },
  { value: "month", label: "By month" },
];

// `groupOptions` defaults to the date groupings; a list can add its own
// (pages add "By type").
export default function ListToolbar<K extends string, G extends string = DateGroupBy>({
  query, onQueryChange, searchPlaceholder,
  filterLabel, filterValue, onFilterChange, filterOptions,
  sortValue, onSortChange, sortOptions,
  groupBy, onGroupByChange, groupOptions,
  className,
}: Readonly<{
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  filterLabel?: string;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: readonly ToolbarOption[];
  sortValue: K;
  onSortChange: (value: K) => void;
  sortOptions: readonly ToolbarOption[];
  groupBy: G;
  onGroupByChange: (value: G) => void;
  groupOptions?: readonly { value: G; label: string }[];
  className?: string;
}>) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsId = useId();
  const hasActiveSearch = query.trim().length > 0;
  const hasActiveFilter = filterOptions && filterValue !== filterOptions[0]?.value;

  return (
    <div className={className}>
      <div className={clsx("flex flex-wrap items-center gap-3")}>
        <div className={clsx("relative min-w-48 flex-1")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={clsx("pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted")}>
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder}
            className={clsx(
              "h-9 w-full min-w-0 rounded-md border border-ink/20 bg-surface pl-8 pr-3",
              "text-sm text-ink placeholder:text-muted",
              "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink",
            )}
          />
        </div>
        <button type="button" aria-expanded={optionsOpen} aria-controls={optionsId} onClick={() => setOptionsOpen(!optionsOpen)} className={clsx("flex h-9 shrink-0 items-center gap-2 rounded-md border border-ink/20 px-3 text-sm text-ink", optionsOpen ? "bg-ink/7" : "hover:bg-ink/5", "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          Sort &amp; filter
          {hasActiveFilter && <span className={clsx("size-1.5 rounded-full bg-chain-lime")}><span className={clsx("sr-only")}>(filter on)</span></span>}
        </button>
      </div>
      {optionsOpen && <div id={optionsId} className={clsx("mt-3 grid grid-cols-2 gap-3 @min-xl:grid-cols-3")}>
        {filterOptions && (
          <Select compact label={filterLabel ?? "Filter"} value={filterValue ?? filterOptions[0].value} onChange={(value) => onFilterChange?.(value)} options={filterOptions} className={clsx("min-w-0")} />
        )}
        <Select<string> compact label="Sort by" value={sortValue} onChange={(value) => onSortChange(value as K)} options={sortOptions} className={clsx("min-w-0")} />
        <Select<string> compact label="Group by" value={groupBy} onChange={(value) => onGroupByChange(value as G)} options={groupOptions ?? DATE_GROUP_OPTIONS} className={clsx("min-w-0")} />
      </div>}
      {(hasActiveSearch || hasActiveFilter) && (
        <button type="button" onClick={() => { onQueryChange(""); if (filterOptions) onFilterChange?.(filterOptions[0].value); }} className={clsx("mt-3 h-9 rounded-md bg-ink/8 px-3 text-sm font-medium text-ink", "hover:bg-ink/15")}>Clear search and filter</button>
      )}
    </div>
  );
}
