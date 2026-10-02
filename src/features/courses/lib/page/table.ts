import { desktop, sql } from "@chain/sdk";

import type { PageRow } from "../../../../shared/lib/db/schema/page";
import { CompletionStatus } from "../completion-status";
import type { Page, PageFilter, PageLink, PageProgress, PageType } from "./types";

export const pageTable = () => desktop.storage.table<PageRow>("page");

export function toPage(row: PageRow): Page {
  return {
    ...row,
    type: row.type as PageType,
    status: row.status as CompletionStatus,
    bookmarked: Boolean(row.bookmarked)
  };
}

export async function getPage(id: number) {
  const row = await pageTable().where({ id, deleted_at: null }).first();
  return row ? toPage(row) : undefined;
}

export async function getPages(moduleId: number, filter: PageFilter = {}) {
  let query = pageTable().where({
    module_id: moduleId,
    deleted_at: null,
    type: filter.type,
    status: filter.status,
    bookmarked: filter.bookmarked === undefined ? undefined : Number(filter.bookmarked)
  });
  if (filter.createdFrom !== undefined) query = query.where(sql`date(created_at) >= date(${filter.createdFrom})`);
  if (filter.createdTo !== undefined) query = query.where(sql`date(created_at) <= date(${filter.createdTo})`);
  const rows = await query.orderBy("position", "created_at", "id").all();
  return rows.map(toPage);
}

async function queryPageProgress(key: "id" | "course_id", where: string, params: number[]) {
  const rows = await desktop.storage.query<{ key: number; total: number; done: number }>(
    `SELECT module.${key} AS key, COUNT(*) AS total, SUM(page.status = ?) AS done
     FROM page JOIN module ON module.id = page.module_id WHERE page.deleted_at IS NULL ${where} GROUP BY module.${key}`,
    [CompletionStatus.Completed, ...params]
  );
  return new Map(
    rows.map((row): [number, PageProgress] => [row.key, { total: row.total, done: row.done ?? 0 }])
  );
}

export function getModulePageProgress(courseId: number) {
  return queryPageProgress("id", "AND module.course_id = ?", [courseId]);
}

export function getCoursePageProgress() {
  return queryPageProgress("course_id", "", []);
}

export async function searchPages(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const like = `%${trimmed}%`;
  const rows = await desktop.storage.query<Omit<PageRow, "content">>(
    `SELECT id, module_id, title, type, status, progress, bookmarked, icon, cover, position, created_at, updated_at, opened_at, deleted_at
     FROM page WHERE deleted_at IS NULL AND (title LIKE ? OR content LIKE ?) ORDER BY created_at, id`,
    [like, like]
  );
  return rows.map((row) => {
    const { content: _content, ...summary } = toPage({ ...row, content: null });
    return summary;
  });
}

export function searchPageLinks(query: string, limit: number) {
  const trimmed = query.trim().replace(/[\\%_]/g, "\\$&");
  const like = `%${trimmed}%`;
  return desktop.storage.query<PageLink>(
    `SELECT page.id, page.title, page.module_id, module.name AS module_name, module.course_id,
       page.title LIKE ? ESCAPE '\\' AS in_title
     FROM page JOIN module ON module.id = page.module_id
     WHERE page.deleted_at IS NULL AND (page.title LIKE ? ESCAPE '\\' OR page.content LIKE ? ESCAPE '\\')
     ORDER BY in_title DESC, page.title LIKE ? ESCAPE '\\' DESC, page.title COLLATE NOCASE LIMIT ?`,
    [like, like, like, `${trimmed}%`, limit]
  );
}
