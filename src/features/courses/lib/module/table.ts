import { desktop, sql, type SqlFragment, type Values } from "@chain/sdk";

import { savePositions } from "../../../../shared/lib/db/positions";
import type { ModuleRow } from "../../../../shared/lib/db/schema/module";
import type { PageRow } from "../../../../shared/lib/db/schema/page";
import type { CompletionStatus } from "../completion-status";
import type { Module, ModuleFilter, ModuleLink } from "./types";

const moduleTable = () => desktop.storage.table<ModuleRow>("module");

function toModule(row: ModuleRow): Module {
  return { ...row, status: row.status as CompletionStatus, bookmarked: Boolean(row.bookmarked) };
}

export async function getModules(courseId: number, filter: ModuleFilter = {}) {
  let query = moduleTable().where({
    course_id: courseId,
    deleted_at: null,
    status: filter.status,
    bookmarked: filter.bookmarked === undefined ? undefined : Number(filter.bookmarked)
  });
  if (filter.createdFrom !== undefined)
    query = query.where(sql`date(created_at) >= date(${filter.createdFrom})`);
  if (filter.createdTo !== undefined)
    query = query.where(sql`date(created_at) <= date(${filter.createdTo})`);
  const rows = await query.orderBy("position", "created_at", "id").all();
  return rows.map(toModule);
}

export async function getModule(id: number) {
  const row = await moduleTable().where({ id, deleted_at: null }).first();
  return row ? toModule(row) : undefined;
}

export async function getModuleCounts() {
  const rows = await desktop.storage.query<{ course_id: number; count: number }>(
    "SELECT course_id, COUNT(*) AS count FROM module WHERE deleted_at IS NULL GROUP BY course_id"
  );
  return new Map(rows.map((row) => [row.course_id, row.count]));
}

export function getModuleDestinations() {
  return desktop.storage.query<ModuleLink>(
    `SELECT module.id, module.name, module.course_id, course.name AS course_name
     FROM module JOIN course ON course.id = module.course_id
     WHERE module.deleted_at IS NULL
     ORDER BY course.position, course.created_at, module.position, module.created_at`,
    []
  );
}

export function searchModuleLinks(query: string, limit: number) {
  const trimmed = query.trim().replace(/[\\%_]/g, String.raw`\$&`);
  return desktop.storage.query<ModuleLink>(
    String.raw`SELECT module.id, module.name, module.course_id, course.name AS course_name
     FROM module JOIN course ON course.id = module.course_id
     WHERE module.deleted_at IS NULL AND module.name LIKE ? ESCAPE '\'
     ORDER BY module.name LIKE ? ESCAPE '\' DESC, module.name COLLATE NOCASE LIMIT ?`,
    [`%${trimmed}%`, `${trimmed}%`, limit]
  );
}

export function getModulesMatching(filter: SqlFragment) {
  return moduleTable().where(filter).all();
}

export async function insertModule(
  values: Omit<Values<ModuleRow>, "position"> & { course_id: number; name: string }
) {
  const row = await moduleTable().insert({
    ...values,
    position: sql`SELECT COALESCE(MAX(position), 0) + 1 FROM module WHERE course_id = ${values.course_id}`
  });
  return toModule(row);
}

export async function updateModuleColumns(id: number, changes: Values<ModuleRow>) {
  const edited = Object.values(changes).some((value) => value !== undefined);
  const [row] = await moduleTable().update(
    { id, deleted_at: null },
    edited ? { ...changes, updated_at: sql`datetime('now')` } : {}
  );
  return row ? toModule(row) : undefined;
}

export function saveModulePositions(ids: number[]) {
  return savePositions("module", ids);
}

export function softDeleteModule(id: number, deletedAt: string) {
  return desktop.storage.transaction(async (tx) => {
    await tx
      .table<PageRow>("page")
      .update({ module_id: id, deleted_at: null }, { deleted_at: deletedAt });
    await tx.table<ModuleRow>("module").update({ id, deleted_at: null }, { deleted_at: deletedAt });
  });
}

export async function deleteModuleRows(filter: SqlFragment) {
  await moduleTable().delete(filter);
}
