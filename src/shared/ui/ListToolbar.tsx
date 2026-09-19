import clsx from "clsx";
import type { DateGroupBy } from "../lib/dateGroups";

export type ToolbarOption = { value: string; label: string };
export type ViewMode = "gallery" | "list";

const GROUP_OPTIONS: { value: DateGroupBy; label: string }[] = [
  { value: "none", label: "Don’t group" },
  { value: "day", label: "By day" },
  { value: "week", label: "By week" },
  { value: "month", label: "By month" },
];

export default function ListToolbar<K extends string>({
  query, onQueryChange, searchPlaceholder,
  filterLabel, filterValue, onFilterChange, filterOptions,
  sortValue, onSortChange, sortOptions,
  groupBy, onGroupByChange,
  viewMode, onViewModeChange,
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
  groupBy: DateGroupBy;
  onGroupByChange: (value: DateGroupBy) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  className?: string;
}>) {
  const selectClassName = clsx(
    "h-9 w-full rounded-md border border-ink/20 bg-surface px-2 text-sm text-ink",
    "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink",
  );
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
        <fieldset className={clsx("flex shrink-0 overflow-hidden rounded-md border border-ink/20")}>
          <legend className={clsx("sr-only")}>View</legend>
          <button
            type="button" aria-label="Gallery view" aria-pressed={viewMode === "gallery"} onClick={() => onViewModeChange("gallery")}
            className={clsx("flex h-9 w-9 items-center justify-center", viewMode === "gallery" ? "bg-ink/10 text-ink" : "text-muted hover:bg-ink/5")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg>
          </button>
          <button
            type="button" aria-label="List view" aria-pressed={viewMode === "list"} onClick={() => onViewModeChange("list")}
            className={clsx("flex h-9 w-9 items-center justify-center border-l border-ink/20", viewMode === "list" ? "bg-ink/10 text-ink" : "text-muted hover:bg-ink/5")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </fieldset>
      </div>
      <div className={clsx("mt-3 grid grid-cols-2 gap-3 @min-xl:grid-cols-3")}>
        {filterOptions && (
          <label className={clsx("min-w-0 text-xs font-medium text-muted")}>
            {filterLabel}
            <select value={filterValue} onChange={(event) => onFilterChange?.(event.target.value)} className={clsx(selectClassName, "mt-1")}>
              {filterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        )}
        <label className={clsx("min-w-0 text-xs font-medium text-muted")}>
          Sort by
          <select value={sortValue} onChange={(event) => onSortChange(event.target.value as K)} className={clsx(selectClassName, "mt-1")}>
            {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className={clsx("min-w-0 text-xs font-medium text-muted")}>
          Group by
          <select value={groupBy} onChange={(event) => onGroupByChange(event.target.value as DateGroupBy)} className={clsx(selectClassName, "mt-1")}>
            {GROUP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      {(hasActiveSearch || hasActiveFilter) && (
        <button type="button" onClick={() => { onQueryChange(""); if (filterOptions) onFilterChange?.(filterOptions[0].value); }} className={clsx("mt-3 h-9 rounded-md bg-ink/8 px-3 text-sm font-medium text-ink", "hover:bg-ink/15")}>Clear search and filter</button>
      )}
    </div>
  );
}
