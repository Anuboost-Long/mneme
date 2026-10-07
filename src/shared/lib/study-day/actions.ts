import { countStudy, getStudiedDays, getStudyDaysSince } from "./table";
import { localDay, type StudyDay } from "./types";

export async function recordStudy(activity: "opened" | "completed") {
  await countStudy(localDay(), activity).catch(() => undefined);
}

export async function getStudyDays(days: number): Promise<StudyDay[]> {
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return localDay(date);
  });
  const rows = await getStudyDaysSince(dates[0]);
  const byDay = new Map(rows.map((row) => [row.day, row]));
  return dates.map((day) => byDay.get(day) ?? { day, opened: 0, completed: 0 });
}

export async function getStreak() {
  const rows = await getStudiedDays(400);
  const studied = new Set(rows.map((row) => row.day));
  const date = new Date();
  if (!studied.has(localDay(date))) date.setDate(date.getDate() - 1);
  let streak = 0;
  while (studied.has(localDay(date))) {
    streak++;
    date.setDate(date.getDate() - 1);
  }
  return {
    streak,
    best: longestRun([...studied].sort((left, right) => left.localeCompare(right)))
  };
}

function longestRun(days: string[]) {
  let best = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const day of days) {
    const date = new Date(`${day}T12:00:00`);
    run =
      previous && Math.round((date.getTime() - previous.getTime()) / 86_400_000) === 1
        ? run + 1
        : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}
