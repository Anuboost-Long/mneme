import { desktop, sql } from "@chain/sdk";

import type { TaskRow } from "../../../../shared/lib/db/schema/task";
import type { Task, TaskDraft, TaskFilter } from "./types";

const taskTable = () => desktop.storage.table<TaskRow>("task");

export function getTasks({ courseId, open }: TaskFilter = {}) {
  const conditions = [
    "(task.course_id IS NULL OR (course.id IS NOT NULL AND course.deleted_at IS NULL))",
    "(task.module_id IS NULL OR (module.id IS NOT NULL AND module.deleted_at IS NULL))"
  ];
  const values: unknown[] = [];
  if (courseId !== undefined) {
    conditions.push("task.course_id = ?");
    values.push(courseId);
  }
  if (open) conditions.push("task.completed_at IS NULL");
  return desktop.storage.query<Task>(
    `SELECT task.*, course.name AS course_name, module.name AS module_name,
       CASE WHEN page.deleted_at IS NULL THEN page.title END AS page_title
     FROM task
     LEFT JOIN course ON course.id = task.course_id
     LEFT JOIN module ON module.id = task.module_id
     LEFT JOIN page ON page.id = task.page_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY task.due_on IS NULL, task.due_on, task.id`,
    values
  );
}

export async function getModuleTaskTitles(moduleId: number) {
  const rows = await taskTable().where({ module_id: moduleId }).all();
  return rows.map((row) => row.title);
}

export async function insertTasks(drafts: TaskDraft[]) {
  await desktop.storage.transaction(async (tx) => {
    const table = tx.table<TaskRow>("task");
    for (const draft of drafts) await table.insert({ ...draft, page_id: draft.page_id ?? null });
  });
}

export async function updateTaskRow(id: number, draft: TaskDraft) {
  await taskTable().update(id, { ...draft, updated_at: sql`datetime('now')` });
}

export async function setTaskCompleted(id: number, done: boolean) {
  await taskTable().update(id, {
    completed_at: done ? sql`datetime('now')` : null,
    updated_at: sql`datetime('now')`
  });
}

export async function deleteTaskRow(id: number) {
  await taskTable().delete({ id });
}

export async function deleteOrphanTasks() {
  await desktop.storage.execute(
    `DELETE FROM task WHERE (course_id IS NOT NULL AND course_id NOT IN (SELECT id FROM course))
       OR (module_id IS NOT NULL AND module_id NOT IN (SELECT id FROM module))`
  );
  await desktop.storage.execute(
    "UPDATE task SET page_id = NULL WHERE page_id IS NOT NULL AND page_id NOT IN (SELECT id FROM page)"
  );
}
