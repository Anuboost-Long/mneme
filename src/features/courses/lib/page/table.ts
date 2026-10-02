import { desktop, sql, type SqlFragment, type Values } from "@chain/sdk";

import { savePositions } from "../../../../shared/lib/db/positions";
import type { HighlightRow } from "../../../../shared/lib/db/schema/highlight";
import type { PageRow } from "../../../../shared/lib/db/schema/page";
import { CompletionStatus } from "../completion-status";
import type { Page, PageFilter, PageLink, PageProgress, PageType } from "./types";

const pageTable = () => desktop.storage.table<PageRow>("page");

function toPage(row: PageRow): Page {
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
  if (filter.createdFrom !== undefined)
    query = query.where(sql`date(created_at) >= date(${filter.createdFrom})`);
  if (filter.createdTo !== undefined)
    query = query.where(sql`date(created_at) <= date(${filter.createdTo})`);
  const rows = await query.orderBy("position", "created_at", "id").all();
  return rows.map(toPage);
}

async function queryPageProgress(key: "id" | "course_id", where: string, params: number[]) {
  const rows = await desktop.storage.query<{
    key: number;
    total: number;
    done: number;
  }>(
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

export function getPagesWithInlineImages() {
  return pageTable()
    .where(sql`content LIKE '%src="data:image/%'`)
    .all();
}

export function getPagesMatching(filter: SqlFragment) {
  return pageTable().where(filter).all();
}

const nextPosition = (moduleId: number) =>
  sql`SELECT COALESCE(MAX(position), 0) + 1 FROM page WHERE module_id = ${moduleId}`;

export async function insertPage(
  values: Omit<Values<PageRow>, "position"> & { module_id: number }
) {
  const row = await pageTable().insert({
    ...values,
    position: nextPosition(values.module_id)
  });
  return getPage(row.id);
}

export async function updatePageColumns(id: number, changes: Values<PageRow>) {
  const edited = Object.values(changes).some((value) => value !== undefined);
  const [row] = await pageTable().update(
    { id, deleted_at: null },
    edited ? { ...changes, updated_at: sql`datetime('now')` } : {}
  );
  return row ? toPage(row) : undefined;
}

export async function replacePageContent(id: number, from: string, to: string) {
  await pageTable().update({ id, content: from }, { content: to });
}

export async function setPageOpened(id: number) {
  await pageTable().update({ id }, { opened_at: sql`datetime('now')` });
}

export function savePagePositions(ids: number[]) {
  return savePositions("page", ids);
}

export function movePageToModule(id: number, moduleId: number) {
  return desktop.storage.transaction(async (tx) => {
    const [row] = await tx.table<PageRow>("page").update(
      { id, deleted_at: null },
      {
        module_id: moduleId,
        position: nextPosition(moduleId),
        updated_at: sql`datetime('now')`
      }
    );
    if (!row) return undefined;
    await tx.table<HighlightRow>("highlight").update({ page_id: id }, { module_id: moduleId });
    return toPage(row);
  });
}

export async function softDeletePages(ids: number[], deletedAt: string) {
  await pageTable().update({ id: ids, deleted_at: null }, { deleted_at: deletedAt });
}

export async function deletePageRows(filter: SqlFragment) {
  await pageTable().delete(filter);
}
