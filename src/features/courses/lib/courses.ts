import { desktop } from "@chain/sdk";
import type { CourseRow } from "../../../shared/lib/db/schema/course";
import { CompletionStatus } from "./completion-status";

export type Course = {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  status: CompletionStatus;
  progress: number;
  bookmarked: boolean;
  created_at: string;
  updated_at: string;
};

export type CourseInput = {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  status?: CompletionStatus;
  progress?: number;
  bookmarked?: boolean;
};

export type CourseFilter = {
  status?: CompletionStatus;
  bookmarked?: boolean;
  createdFrom?: string;
  createdTo?: string;
};

function courseName(name: string) {
  if (!name.trim()) throw new Error("Enter a course name.");
  return name.trim();
}

function clampProgress(progress: number) {
  return Math.min(100, Math.max(0, Math.round(progress)));
}

function toCourse(row: CourseRow): Course {
  return { ...row, status: row.status as CompletionStatus, bookmarked: Boolean(row.bookmarked) };
}

export async function getCourses(filter: CourseFilter = {}) {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (filter.status !== undefined) { conditions.push("status = ?"); params.push(filter.status); }
  if (filter.bookmarked !== undefined) { conditions.push("bookmarked = ?"); params.push(filter.bookmarked ? 1 : 0); }
  if (filter.createdFrom !== undefined) { conditions.push("date(created_at) >= date(?)"); params.push(filter.createdFrom); }
  if (filter.createdTo !== undefined) { conditions.push("date(created_at) <= date(?)"); params.push(filter.createdTo); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await desktop.storage.query<CourseRow>(`SELECT * FROM course ${where} ORDER BY created_at, id`, params);
  return rows.map(toCourse);
}

export async function getCourse(id: number) {
  const [row] = await desktop.storage.query<CourseRow>("SELECT * FROM course WHERE id = ?", [id]);
  return row ? toCourse(row) : undefined;
}

export async function createCourse(input: CourseInput) {
  const result = await desktop.storage.execute(
    "INSERT INTO course (name, description, icon, color, status, progress, bookmarked) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      courseName(input.name),
      input.description?.trim() || null,
      input.icon || null,
      input.color || null,
      input.status ?? CompletionStatus.NotStarted,
      clampProgress(input.progress ?? 0),
      input.bookmarked ? 1 : 0,
    ],
  );
  const course = await getCourse(result.lastInsertId);
  if (!course) throw new Error("The saved course could not be found.");
  return course;
}

export async function updateCourse(id: number, input: Partial<CourseInput>) {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(courseName(input.name));
  }
  for (const key of ["description", "icon", "color"] as const) {
    if (input[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(input[key]?.trim() || null);
    }
  }
  if (input.status !== undefined) { fields.push("status = ?"); values.push(input.status); }
  if (input.progress !== undefined) { fields.push("progress = ?"); values.push(clampProgress(input.progress)); }
  if (input.bookmarked !== undefined) { fields.push("bookmarked = ?"); values.push(input.bookmarked ? 1 : 0); }
  if (fields.length) {
    await desktop.storage.execute(
      `UPDATE course SET ${fields.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
      [...values, id],
    );
  }
  const course = await getCourse(id);
  if (!course) throw new Error("This course no longer exists.");
  return course;
}

export async function deleteCourse(id: number) {
  await desktop.storage.execute("DELETE FROM page WHERE module_id IN (SELECT id FROM module WHERE course_id = ?)", [id]);
  await desktop.storage.execute("DELETE FROM module WHERE course_id = ?", [id]);
  await desktop.storage.execute("DELETE FROM course WHERE id = ?", [id]);
}
