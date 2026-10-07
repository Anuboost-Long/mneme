export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// SQLite's datetime('now') is UTC without a zone marker.
export function parseStoredDate(stored: string) {
  return new Date(stored.includes("T") ? stored : `${stored.replace(" ", "T")}Z`);
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function ago(value: number, unit: Intl.RelativeTimeFormatUnit) {
  const text = relative.format(-value, unit);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "Just now", "12 min ago", "3 hours ago", "Yesterday", then a date.
export function timeAgo(stored: string, now = Date.now()) {
  const minutes = Math.round((now - parseStoredDate(stored).getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return ago(hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 7) return ago(days, "day");
  return parseStoredDate(stored).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
