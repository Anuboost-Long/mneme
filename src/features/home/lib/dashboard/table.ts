import { desktop } from "@chain/sdk";

import { CompletionStatus } from "../../../courses/lib/completion-status";
import type {
  OpenModule,
  PageFilter,
  PageSort,
  RecentHighlight,
  RecentPage,
  RecentRecording,
  ShelfCourse
} from "./types";

const seenAt = "page.opened_at";

const orderBy: Record<PageSort, string> = {
  opened: "seen_at DESC, page.id DESC",
  edited: "page.updated_at DESC, page.id DESC",
  created: "page.created_at DESC, page.id DESC",
  title: "page.title COLLATE NOCASE"
};

function pageWhere({ courseId, type, status }: PageFilter) {
  const conditions = ["page.deleted_at IS NULL"];
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
export function getModuleProgress({
  courseId,
  includeDone = false,
  limit
}: {
  courseId?: number;
  includeDone?: boolean;
  limit: number;
}) {
  const order = includeDone ? "module.position, module.id" : "MAX(" + seenAt + ") DESC";
  return desktop.storage.query<OpenModule>(
    `SELECT module.id, module.name, module.icon, module.course_id, course.name AS course_name, course.color AS course_color,
       COUNT(page.id) AS total, COALESCE(SUM(page.status = ?), 0) AS done
     FROM module JOIN course ON course.id = module.course_id JOIN page ON page.module_id = module.id
     WHERE page.deleted_at IS NULL ${courseId ? "AND module.course_id = ?" : ""}
     GROUP BY module.id
     ${includeDone ? "" : "HAVING done < total"}
     ORDER BY ${order} LIMIT ?`,
    [CompletionStatus.Completed, ...(courseId ? [courseId] : []), limit]
  );
}
export async function getCourseActivity() {
  const rows = await desktop.storage.query<{ course_id: number; seen_at: string }>(
    `SELECT module.course_id, MAX(${seenAt}) AS seen_at
     FROM page JOIN module ON module.id = page.module_id WHERE page.deleted_at IS NULL GROUP BY module.course_id`
  );
  return new Map(rows.map((row) => [row.course_id, row.seen_at]));
}
export async function countPagesBy(column: "status" | "type", courseId?: number) {
  const rows = await desktop.storage.query<{ key: number; count: number }>(
    `SELECT page.${column} AS key, COUNT(*) AS count FROM page JOIN module ON module.id = page.module_id
     WHERE page.deleted_at IS NULL ${courseId ? "AND module.course_id = ?" : ""} GROUP BY page.${column}`,
    courseId ? [courseId] : []
  );
  return new Map(rows.map((row) => [row.key, row.count]));
}

export async function getLibraryCounts() {
  const [row] = await desktop.storage.query<{
    courses: number;
    modules: number;
    pages: number;
    recordings: number;
    attachments: number;
  }>(
    `SELECT (SELECT COUNT(*) FROM course WHERE deleted_at IS NULL) AS courses, (SELECT COUNT(*) FROM module WHERE deleted_at IS NULL) AS modules,
       (SELECT COUNT(*) FROM page WHERE deleted_at IS NULL) AS pages,
       (SELECT COUNT(*) FROM recording LEFT JOIN page ON page.id = recording.page_id WHERE recording.page_id IS NULL OR page.deleted_at IS NULL) AS recordings,
       (SELECT COUNT(*) FROM attachment JOIN page ON page.id = attachment.page_id WHERE page.deleted_at IS NULL) AS attachments`
  );
  return row;
}

export function getRecentRecordings(limit: number) {
  return desktop.storage.query<RecentRecording>(
    `SELECT recording.id, recording.name, recording.duration_ms, recording.created_at, page.id AS page_id, page.title AS page_title,
       page.module_id, module.course_id
     FROM recording LEFT JOIN page ON page.id = recording.page_id LEFT JOIN module ON module.id = page.module_id
     WHERE recording.page_id IS NULL OR page.deleted_at IS NULL ORDER BY recording.created_at DESC LIMIT ?`,
    [limit]
  );
}

export function getRecentHighlights(limit: number) {
  return desktop.storage.query<RecentHighlight>(
    `SELECT highlight.id, highlight.html, highlight.created_at, page.id AS page_id, page.title AS page_title, page.module_id, module.course_id
     FROM highlight JOIN page ON page.id = highlight.page_id JOIN module ON module.id = page.module_id
     WHERE highlight.orphaned_at IS NULL AND page.deleted_at IS NULL ORDER BY highlight.created_at DESC LIMIT ?`,
    [limit]
  );
}

export async function getAiUsage(days: number) {
  const [row] = await desktop.storage.query<{
    runs: number;
    tokens: number | null;
    cost: number | null;
  }>(
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
     WHERE page.deleted_at IS NULL AND page.id IN (${ids.map(() => "?").join(", ")})`,
    ids
  );
}

export function getCourseShelf() {
  return desktop.storage.query<ShelfCourse>(
    `SELECT course.id, course.name, course.color, COUNT(page.id) AS pages, COALESCE(SUM(page.status = ?), 0) AS done
     FROM course LEFT JOIN module ON module.course_id = course.id AND module.deleted_at IS NULL
       LEFT JOIN page ON page.module_id = module.id AND page.deleted_at IS NULL
     WHERE course.deleted_at IS NULL GROUP BY course.id ORDER BY course.position, course.id`,
    [CompletionStatus.Completed]
  );
}
