import { desktop } from "@chain/sdk";
import type { ModuleRow } from "../../../shared/lib/db/schema/module";
import { CompletionStatus, completionStatuses, completionStatusLabels } from "./completion-status";

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
  created_at: string;
  updated_at: string;
};

export type ModuleInput = {
  name: string;
  description?: string | null;
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
  if (filter.status !== undefined) { conditions.push("status = ?"); params.push(filter.status); }
  if (filter.bookmarked !== undefined) { conditions.push("bookmarked = ?"); params.push(filter.bookmarked ? 1 : 0); }
  if (filter.createdFrom !== undefined) { conditions.push("date(created_at) >= date(?)"); params.push(filter.createdFrom); }
  if (filter.createdTo !== undefined) { conditions.push("date(created_at) <= date(?)"); params.push(filter.createdTo); }
  const rows = await desktop.storage.query<ModuleRow>(
    `SELECT * FROM module WHERE ${conditions.join(" AND ")} ORDER BY created_at, id`,
    params,
  );
  return rows.map(toModule);
}

export async function getModule(id: number) {
  const [row] = await desktop.storage.query<ModuleRow>("SELECT * FROM module WHERE id = ?", [id]);
  return row ? toModule(row) : undefined;
}

export async function createModule(courseId: number, input: ModuleInput) {
  const result = await desktop.storage.execute(
    "INSERT INTO module (course_id, name, description, status, progress, bookmarked) VALUES (?, ?, ?, ?, ?, ?)",
    [
      courseId,
      moduleName(input.name),
      input.description?.trim() || null,
      input.status ?? CompletionStatus.NotStarted,
      clampProgress(input.progress ?? 0),
      input.bookmarked ? 1 : 0,
    ],
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
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description?.trim() || null);
  }
  if (input.status !== undefined) { fields.push("status = ?"); values.push(input.status); }
  if (input.progress !== undefined) { fields.push("progress = ?"); values.push(clampProgress(input.progress)); }
  if (input.bookmarked !== undefined) { fields.push("bookmarked = ?"); values.push(input.bookmarked ? 1 : 0); }
  if (fields.length) {
    await desktop.storage.execute(
      `UPDATE module SET ${fields.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
      [...values, id],
    );
  }
  const module = await getModule(id);
  if (!module) throw new Error("This module no longer exists.");
  return module;
}

export async function deleteModule(id: number) {
  await desktop.storage.execute("DELETE FROM page WHERE module_id = ?", [id]);
  await desktop.storage.execute("DELETE FROM module WHERE id = ?", [id]);
}
