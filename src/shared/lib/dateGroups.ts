export type DateGroupBy = "none" | "day" | "week" | "month";

export const DATE_GROUP_VALUES: readonly DateGroupBy[] = ["none", "day", "week", "month"];

export type DateGroup<T> = { key: string; label: string; items: T[] };

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function bucketKey(iso: string, groupBy: Exclude<DateGroupBy, "none">): string {
  const date = new Date(iso);
  if (groupBy === "day") return dateKey(date);
  if (groupBy === "week") return dateKey(startOfWeek(date));
  return dateKey(date).slice(0, 7);
}

function bucketLabel(key: string, groupBy: Exclude<DateGroupBy, "none">): string {
  if (groupBy === "day") return dateFromKey(key).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  if (groupBy === "week") {
    const start = dateFromKey(key);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const short = (date: Date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `Week of ${short(start)} – ${short(end)}`;
  }
  return dateFromKey(`${key}-01`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

// Groups preserve each item's position relative to other items already in
// the same bucket, so whatever sort order the caller applied upstream
// (name, date, ...) still holds within a group — only which bucket an item
// lands in is decided here.
export function groupByDate<T>(items: T[], getDate: (item: T) => string, groupBy: DateGroupBy, order: "oldest" | "newest" = "newest"): DateGroup<T>[] {
  if (groupBy === "none") return items.length ? [{ key: "all", label: "", items }] : [];

  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = bucketKey(getDate(item), groupBy);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item); else buckets.set(key, [item]);
  }
  return [...buckets.entries()]
    .sort((a, b) => order === "oldest" ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0]))
    .map(([key, groupItems]) => ({ key, label: bucketLabel(key, groupBy), items: groupItems }));
}
