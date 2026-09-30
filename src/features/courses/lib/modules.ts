import { desktop } from "@chain/sdk";

import type { ModuleRow } from "../../../shared/lib/db/schema/module";
import { CompletionStatus, completionStatuses, completionStatusLabels } from "./completion-status";
import { deletePageAudios } from "../../audiobook/lib/pageAudio";
import { deletePageCovers } from "./pages";
import { deleteAttachments } from "./attachments";
import { deleteRecordings } from "./recordings";

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

function toModule(row: ModuleRow): Module {
  return { ...row, status: row.status as CompletionStatus, bookmarked: Boolean(row.bookmarked) };
}

export async function getModules(courseId: number, filter: ModuleFilter = {}) {
  const conditions = ["course_id = ?"];
  const params: (string | number)[] = [courseId];
  if (filter.status !== undefined) {
    conditions.push("status = ?");
    params.push(filter.status);
  }
  if (filter.bookmarked !== undefined) {
    conditions.push("bookmarked = ?");
    params.push(filter.bookmarked ? 1 : 0);
  }
  if (filter.createdFrom !== undefined) {
    conditions.push("date(created_at) >= date(?)");
    params.push(filter.createdFrom);
  }
  if (filter.createdTo !== undefined) {
    conditions.push("date(created_at) <= date(?)");
    params.push(filter.createdTo);
  }
  const rows = await desktop.storage.query<ModuleRow>(
    `SELECT * FROM module WHERE ${conditions.join(" AND ")} ORDER BY position, created_at, id`,
    params
  );
  return rows.map(toModule);
}

export async function getModuleCounts() {
  const rows = await desktop.storage.query<{ course_id: number; count: number }>(
    "SELECT course_id, COUNT(*) AS count FROM module GROUP BY course_id"
  );
  return new Map(rows.map((row) => [row.course_id, row.count]));
}

export type ModuleLink = { id: number; name: string; course_id: number; course_name: string };

// Every module, in course order then module order: where a page can go.
export function getModuleDestinations() {
  return desktop.storage.query<ModuleLink>(
    `SELECT module.id, module.name, module.course_id, course.name AS course_name
     FROM module JOIN course ON course.id = module.course_id
     ORDER BY course.position, course.created_at, module.position, module.created_at`,
    []
  );
}

export function searchModuleLinks(query: string, limit: number) {
  const trimmed = query.trim().replace(/[\\%_]/g, "\\$&");
  return desktop.storage.query<ModuleLink>(
    `SELECT module.id, module.name, module.course_id, course.name AS course_name
     FROM module JOIN course ON course.id = module.course_id
     WHERE module.name LIKE ? ESCAPE '\\'
     ORDER BY module.name LIKE ? ESCAPE '\\' DESC, module.name COLLATE NOCASE LIMIT ?`,
    [`%${trimmed}%`, `${trimmed}%`, limit]
  );
}

export async function getModule(id: number) {
  const [row] = await desktop.storage.query<ModuleRow>("SELECT * FROM module WHERE id = ?", [id]);
  return row ? toModule(row) : undefined;
}

// New modules go to the end of their course.
export async function createModule(courseId: number, input: ModuleInput) {
  const result = await desktop.storage.execute(
    `INSERT INTO module (course_id, name, description, icon, status, progress, bookmarked, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM module WHERE course_id = ?))`,
    [
      courseId,
      moduleName(input.name),
      input.description?.trim() || null,
      input.icon || null,
      input.status ?? CompletionStatus.NotStarted,
      clampProgress(input.progress ?? 0),
      input.bookmarked ? 1 : 0,
      courseId
    ]
  );
  const module = await getModule(result.lastInsertId);
  if (!module) throw new Error("The saved module could not be found.");
  return module;
}

export async function updateModule(id: number, input: Partial<ModuleInput>) {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(moduleName(input.name));
  }
  for (const key of ["description", "icon"] as const) {
    if (input[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(input[key]?.trim() || null);
    }
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (input.progress !== undefined) {
    fields.push("progress = ?");
    values.push(clampProgress(input.progress));
  }
  if (input.bookmarked !== undefined) {
    fields.push("bookmarked = ?");
    values.push(input.bookmarked ? 1 : 0);
  }
  if (fields.length) {
    await desktop.storage.execute(
      `UPDATE module SET ${fields.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
      [...values, id]
    );
  }
  const module = await getModule(id);
  if (!module) throw new Error("This module no longer exists.");
  return module;
}

// `ids` in their new order within one course.
export async function reorderModules(ids: number[]) {
  for (const [position, id] of ids.entries())
    await desktop.storage.execute("UPDATE module SET position = ? WHERE id = ?", [position + 1, id]);
}

export async function deleteModule(id: number) {
  await deletePageCovers("module_id = ?", [id]);
  await deleteRecordings("page_id IN (SELECT id FROM page WHERE module_id = ?)", [id]);
  await deleteAttachments("page_id IN (SELECT id FROM page WHERE module_id = ?)", [id]);
  await deletePageAudios("page_id IN (SELECT id FROM page WHERE module_id = ?)", [id]);
  await desktop.storage.execute("DELETE FROM page WHERE module_id = ?", [id]);
  await desktop.storage.execute("DELETE FROM module WHERE id = ?", [id]);
}
