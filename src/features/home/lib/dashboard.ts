import { desktop } from "@chain/sdk";

import { localDay } from "../../../shared/lib/studyDays";
import { CompletionStatus } from "../../courses/lib/completion-status";
import type { PageType } from "../../courses/lib/pages";

export type RecentPage = {
  id: number;
  title: string;
  type: PageType;
  icon: string | null;
  status: CompletionStatus;
  module_id: number;
  module_name: string;
  course_id: number;
  course_name: string;
  course_color: string | null;
  seen_at: string;
};

export type OpenModule = {
  id: number;
  name: string;
  icon: string | null;
  course_id: number;
  course_name: string;
  course_color: string | null;
  total: number;
  done: number;
};

// Which pages a widget covers; every key is optional and narrows it.
export type PageFilter = { courseId?: number; type?: PageType; status?: CompletionStatus };

export const pageSorts = { opened: "Last opened", edited: "Last edited", created: "Newest", title: "Title" } as const;

export type PageSort = keyof typeof pageSorts;

// A page counts as recent from when it was last opened, or edited if it
// has never been opened since opened_at was added.
const seenAt = "COALESCE(page.opened_at, page.updated_at)";

const orderBy: Record<PageSort, string> = {
  opened: "seen_at DESC, page.id DESC",
  edited: "page.updated_at DESC, page.id DESC",
  created: "page.created_at DESC, page.id DESC",
  title: "page.title COLLATE NOCASE"
};

function pageWhere({ courseId, type, status }: PageFilter) {
  const conditions: string[] = [];
  const params: number[] = [];
  if (courseId) {
    conditions.push("module.course_id = ?");
    params.push(courseId);
  }
  if (type) {
    conditions.push("page.type = ?");
    params.push(type);
  }
  if (status) {
    conditions.push("page.status = ?");
    params.push(status);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

export function getPages(filter: PageFilter, sort: PageSort, limit: number) {
  const { where, params } = pageWhere(filter);
  return desktop.storage.query<RecentPage>(
    `SELECT page.id, page.title, page.type, page.icon, page.status, page.module_id,
       module.name AS module_name, module.course_id, course.name AS course_name, course.color AS course_color,
       ${seenAt} AS seen_at
     FROM page JOIN module ON module.id = page.module_id JOIN course ON course.id = module.course_id
     ${where} ORDER BY ${orderBy[sort]} LIMIT ?`,
    [...params, limit]
  );
}

export async function countPages(filter: PageFilter) {
  const { where, params } = pageWhere(filter);
  const [row] = await desktop.storage.query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM page JOIN module ON module.id = page.module_id ${where}`,
    params
  );
  return row?.count ?? 0;
}

// Modules with pages left to finish, the most recently studied first.
// With `includeDone`, finished modules too (a course's own progress).
export function getModuleProgress({ courseId, includeDone = false, limit }: { courseId?: number; includeDone?: boolean; limit: number }) {
  const order = includeDone ? "module.position, module.id" : "MAX(" + seenAt + ") DESC";
  return desktop.storage.query<OpenModule>(
    `SELECT module.id, module.name, module.icon, module.course_id, course.name AS course_name, course.color AS course_color,
       COUNT(page.id) AS total, COALESCE(SUM(page.status = ?), 0) AS done
     FROM module JOIN course ON course.id = module.course_id JOIN page ON page.module_id = module.id
     ${courseId ? "WHERE module.course_id = ?" : ""}
     GROUP BY module.id
     ${includeDone ? "" : "HAVING done < total"}
     ORDER BY ${order} LIMIT ?`,
    [CompletionStatus.Completed, ...(courseId ? [courseId] : []), limit]
  );
}

// Course id -> when any of its pages was last opened or edited.
export async function getCourseActivity() {
  const rows = await desktop.storage.query<{ course_id: number; seen_at: string }>(
    `SELECT module.course_id, MAX(${seenAt}) AS seen_at
     FROM page JOIN module ON module.id = page.module_id GROUP BY module.course_id`
  );
  return new Map(rows.map((row) => [row.course_id, row.seen_at]));
}

// How many pages have each status (or type), within a course if given.
export async function countPagesBy(column: "status" | "type", courseId?: number) {
  const rows = await desktop.storage.query<{ key: number; count: number }>(
    `SELECT page.${column} AS key, COUNT(*) AS count FROM page JOIN module ON module.id = page.module_id
     ${courseId ? "WHERE module.course_id = ?" : ""} GROUP BY page.${column}`,
    courseId ? [courseId] : []
  );
  return new Map(rows.map((row) => [row.key, row.count]));
}

export type StudyDay = { day: string; opened: number; completed: number };

// The last `days` days, oldest first, with zeros for days without study.
export async function getStudyDays(days: number): Promise<StudyDay[]> {
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return localDay(date);
  });
  const rows = await desktop.storage.query<StudyDay>("SELECT day, opened, completed FROM study_day WHERE day >= ?", [dates[0]]);
  const byDay = new Map(rows.map((row) => [row.day, row]));
  return dates.map((day) => byDay.get(day) ?? { day, opened: 0, completed: 0 });
}

// Days in a row with a page opened, up to today; today not studied yet
// doesn't break a streak that ran through yesterday.
export async function getStreak() {
  const rows = await desktop.storage.query<{ day: string }>("SELECT day FROM study_day WHERE opened > 0 ORDER BY day DESC LIMIT 400");
  const studied = new Set(rows.map((row) => row.day));
  const date = new Date();
  if (!studied.has(localDay(date))) date.setDate(date.getDate() - 1);
  let streak = 0;
  while (studied.has(localDay(date))) {
    streak++;
    date.setDate(date.getDate() - 1);
  }
  return { streak, best: longestRun([...studied].sort((left, right) => left.localeCompare(right))) };
}

function longestRun(days: string[]) {
  let best = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const day of days) {
    const date = new Date(`${day}T12:00:00`);
    run = previous && Math.round((date.getTime() - previous.getTime()) / 86_400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

export async function getLibraryCounts() {
  const [row] = await desktop.storage.query<{ courses: number; modules: number; pages: number; recordings: number; attachments: number }>(
    `SELECT (SELECT COUNT(*) FROM course) AS courses, (SELECT COUNT(*) FROM module) AS modules, (SELECT COUNT(*) FROM page) AS pages,
       (SELECT COUNT(*) FROM recording) AS recordings, (SELECT COUNT(*) FROM attachment) AS attachments`
  );
  return row;
}

export type RecentRecording = { id: number; name: string; duration_ms: number; created_at: string; page_id: number; page_title: string; module_id: number; course_id: number };

export function getRecentRecordings(limit: number) {
  return desktop.storage.query<RecentRecording>(
    `SELECT recording.id, recording.name, recording.duration_ms, recording.created_at, page.id AS page_id, page.title AS page_title,
       page.module_id, module.course_id
     FROM recording JOIN page ON page.id = recording.page_id JOIN module ON module.id = page.module_id
     ORDER BY recording.created_at DESC LIMIT ?`,
    [limit]
  );
}

export type RecentHighlight = { id: number; html: string; created_at: string; page_id: number; page_title: string; module_id: number; course_id: number };

export function getRecentHighlights(limit: number) {
  return desktop.storage.query<RecentHighlight>(
    `SELECT highlight.id, highlight.html, highlight.created_at, page.id AS page_id, page.title AS page_title, page.module_id, module.course_id
     FROM highlight JOIN page ON page.id = highlight.page_id JOIN module ON module.id = page.module_id
     WHERE highlight.orphaned_at IS NULL ORDER BY highlight.created_at DESC LIMIT ?`,
    [limit]
  );
}

export async function getAiUsage(days: number) {
  const [row] = await desktop.storage.query<{ runs: number; tokens: number | null; cost: number | null }>(
    `SELECT COUNT(*) AS runs, SUM(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) AS tokens, SUM(cost_usd) AS cost
     FROM agent_usage WHERE invoked_at >= datetime('now', ?)`,
    [`-${days} days`]
  );
  return { runs: row?.runs ?? 0, tokens: row?.tokens ?? 0, cost: row?.cost ?? null };
}

export function getPagesByIds(ids: number[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return desktop.storage.query<RecentPage>(
    `SELECT page.id, page.title, page.type, page.icon, page.status, page.module_id,
       module.name AS module_name, module.course_id, course.name AS course_name, course.color AS course_color,
       ${seenAt} AS seen_at
     FROM page JOIN module ON module.id = page.module_id JOIN course ON course.id = module.course_id
     WHERE page.id IN (${ids.map(() => "?").join(", ")})`,
    ids
  );
}

export type ShelfCourse = { id: number; name: string; color: string | null; pages: number; done: number };

// Every course with its page count and pages done, in the user's course order.
export function getCourseShelf() {
  return desktop.storage.query<ShelfCourse>(
    `SELECT course.id, course.name, course.color, COUNT(page.id) AS pages, COALESCE(SUM(page.status = ?), 0) AS done
     FROM course LEFT JOIN module ON module.course_id = course.id LEFT JOIN page ON page.module_id = module.id
     GROUP BY course.id ORDER BY course.position, course.id`,
    [CompletionStatus.Completed]
  );
}
