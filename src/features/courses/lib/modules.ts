import { desktop, sql, type Values } from "@chain/sdk";

import { savePositions } from "../../../shared/lib/db/positions";
import type { ModuleRow } from "../../../shared/lib/db/schema/module";
import type { PageRow } from "../../../shared/lib/db/schema/page";
import { CompletionStatus, completionStatuses, completionStatusLabels } from "./completion-status";
import { deleteIcon, deleteReplacedIcon, storeIcon } from "./course-image";
import { deletionTime, erasePages } from "./page/actions";

export { CompletionStatus as ModuleStatus };
export const moduleStatuses = completionStatuses;
export const moduleStatusLabels = completionStatusLabels;

export type Module = {
  id: number;
  course_id: number;
  name: string;
  description: string | null;
  status: CompletionStatus;
  progress: number;
  bookmarked: boolean;
  icon: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ModuleInput = {
  name: string;
  description?: string | null;
  icon?: string | null;
  status?: CompletionStatus;
  progress?: number;
  bookmarked?: boolean;
};

export type ModuleFilter = {
  status?: CompletionStatus;
  bookmarked?: boolean;
  createdFrom?: string;
  createdTo?: string;
};

function moduleName(name: string) {
  if (!name.trim()) throw new Error("Enter a module name.");
  return name.trim();
}

function clampProgress(progress: number) {
  return Math.min(100, Math.max(0, Math.round(progress)));
}

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
  if (filter.createdFrom !== undefined) query = query.where(sql`date(created_at) >= date(${filter.createdFrom})`);
  if (filter.createdTo !== undefined) query = query.where(sql`date(created_at) <= date(${filter.createdTo})`);
  const rows = await query.orderBy("position", "created_at", "id").all();
  return rows.map(toModule);
}

export async function getModuleCounts() {
  const rows = await desktop.storage.query<{ course_id: number; count: number }>(
    "SELECT course_id, COUNT(*) AS count FROM module WHERE deleted_at IS NULL GROUP BY course_id"
  );
  return new Map(rows.map((row) => [row.course_id, row.count]));
}

export type ModuleLink = { id: number; name: string; course_id: number; course_name: string };

// Every module, in course order then module order: where a page can go.
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
  const trimmed = query.trim().replace(/[\\%_]/g, "\\$&");
  return desktop.storage.query<ModuleLink>(
    `SELECT module.id, module.name, module.course_id, course.name AS course_name
     FROM module JOIN course ON course.id = module.course_id
     WHERE module.deleted_at IS NULL AND module.name LIKE ? ESCAPE '\\'
     ORDER BY module.name LIKE ? ESCAPE '\\' DESC, module.name COLLATE NOCASE LIMIT ?`,
    [`%${trimmed}%`, `${trimmed}%`, limit]
  );
}

export async function getModule(id: number) {
  const row = await moduleTable().where({ id, deleted_at: null }).first();
  return row ? toModule(row) : undefined;
}

// New modules go to the end of their course.
export async function createModule(courseId: number, input: ModuleInput) {
  const row = await moduleTable().insert({
    course_id: courseId,
    name: moduleName(input.name),
    description: input.description?.trim() || null,
    icon: await storeIcon(input.icon),
    status: input.status ?? CompletionStatus.NotStarted,
    progress: clampProgress(input.progress ?? 0),
    bookmarked: input.bookmarked ? 1 : 0,
    position: sql`SELECT COALESCE(MAX(position), 0) + 1 FROM module WHERE course_id = ${courseId}`
  });
  return toModule(row);
}

export async function updateModule(id: number, input: Partial<ModuleInput>) {
  const changes: Values<ModuleRow> = {
    name: input.name === undefined ? undefined : moduleName(input.name),
    description: input.description === undefined ? undefined : input.description?.trim() || null,
    icon: input.icon === undefined ? undefined : await storeIcon(input.icon),
    status: input.status,
    progress: input.progress === undefined ? undefined : clampProgress(input.progress),
    bookmarked: input.bookmarked === undefined ? undefined : Number(input.bookmarked)
  };
  const edited = Object.values(changes).some((value) => value !== undefined);
  const previousIcon = changes.icon === undefined ? null : (await getModule(id))?.icon;
  const [row] = await moduleTable().update({ id, deleted_at: null }, edited ? { ...changes, updated_at: sql`datetime('now')` } : {});
  if (!row) throw new Error("This module no longer exists.");
  if (changes.icon !== undefined) await deleteReplacedIcon(previousIcon, row.icon);
  return toModule(row);
}

// `ids` in their new order within one course.
export async function reorderModules(ids: number[]) {
  await savePositions("module", ids);
}

export async function deleteModule(id: number) {
  const deletedAt = deletionTime();
  await desktop.storage.transaction(async (tx) => {
    await tx.table<PageRow>("page").update({ module_id: id, deleted_at: null }, { deleted_at: deletedAt });
    await tx.table<ModuleRow>("module").update({ id, deleted_at: null }, { deleted_at: deletedAt });
  });
}

export async function eraseModules(filter: string, params: unknown[]) {
  await erasePages(`module_id IN (SELECT id FROM module WHERE ${filter})`, params);
  const icons = await desktop.storage.query<{ icon: string | null }>(`SELECT icon FROM module WHERE ${filter}`, params);
  for (const { icon } of icons) await deleteIcon(icon);
  await desktop.storage.execute(`DELETE FROM module WHERE ${filter}`, params);
}
