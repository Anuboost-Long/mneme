import { desktop, sql } from "@chain/sdk";

import type { StudyDayRow } from "../db/schema/study-day";

const studyDayTable = () => desktop.storage.table<StudyDayRow>("study_day");

export function getStudyDaysSince(day: string) {
  return studyDayTable()
    .where(sql`day >= ${day}`)
    .all();
}

export function getStudiedDays(limit: number) {
  return studyDayTable()
    .where(sql`opened > 0`)
    .orderBy("day desc")
    .limit(limit)
    .all();
}

export async function countStudy(day: string, activity: "opened" | "completed") {
  await desktop.storage.execute(
    `INSERT INTO study_day (day, ${activity}) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET ${activity} = ${activity} + 1`,
    [day]
  );
}
