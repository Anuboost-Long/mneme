import { useMemo, useState } from "react";
import { useStoredChoice } from "./useStoredChoice";

export type SortOption<T, K extends string> = { value: K; label: string; compare: (a: T, b: T) => number };

// Generic over the item and its sort-key union so callers (a page list, a
// module list, ...) only ever hand this the comparison logic that's
// actually specific to them, not a domain wrapper object.
export function useListView<T, K extends string>(
  items: T[],
  matchesQuery: (item: T, query: string) => boolean,
  sorts: readonly SortOption<T, K>[],
  sortStorageKey: string,
) {
  const [query, setQuery] = useState("");
  const [sortValue, setSortValue] = useStoredChoice(sortStorageKey, sorts.map((sort) => sort.value), sorts[0].value);

  const visible = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const matched = trimmed ? items.filter((item) => matchesQuery(item, trimmed)) : items;
    const sort = sorts.find((option) => option.value === sortValue) ?? sorts[0];
    return [...matched].sort(sort.compare);
  }, [items, query, sortValue, matchesQuery, sorts]);

  return { query, setQuery, sortValue, setSortValue, visible };
}
