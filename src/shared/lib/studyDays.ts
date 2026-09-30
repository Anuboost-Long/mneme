import { desktop } from "@chain/sdk";

// "YYYY-MM-DD" for the user's local day, which is what a streak counts.
export function localDay(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Best effort: a missed count must never fail opening or finishing a page.
export async function recordStudy(activity: "opened" | "completed") {
  await desktop.storage
    .execute(`INSERT INTO study_day (day, ${activity}) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET ${activity} = ${activity} + 1`, [localDay()])
    .catch(() => undefined);
}
