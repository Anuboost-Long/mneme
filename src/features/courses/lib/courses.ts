import { desktop } from "@chain/sdk";

import type { CourseRow } from "../../../shared/lib/db/schema/course";
import { CompletionStatus } from "./completion-status";
import { deletePageAudios } from "../../audiobook/lib/pageAudio";
import { deleteImage } from "./page-image";
import { deletePageCovers } from "./pages";
import { deleteAttachments } from "./attachments";
import { deleteRecordings } from "./recordings";

export type Course = {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  status: CompletionStatus;
  progress: number;
  bookmarked: boolean;
  ai_profile_id: number | null;
  cover: string | null;
  position: number;
  code: string | null;
  semester: string | null;
  school: string | null;
  instructor: string | null;
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
  ai_profile_id?: number | null;
  cover?: string | null;
  code?: string | null;
  semester?: string | null;
  school?: string | null;
  instructor?: string | null;
};

// Optional text, stored trimmed or as NULL.
const TEXT_FIELDS = ["description", "icon", "color", "code", "semester", "school", "instructor"] as const;

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
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await desktop.storage.query<CourseRow>(
    `SELECT * FROM course ${where} ORDER BY position, created_at, id`,
    params
  );
  return rows.map(toCourse);
}

export async function getCourse(id: number) {
  const [row] = await desktop.storage.query<CourseRow>("SELECT * FROM course WHERE id = ?", [id]);
  return row ? toCourse(row) : undefined;
}

// New courses go to the end of the list.
export async function createCourse(input: CourseInput) {
  const result = await desktop.storage.execute(
    `INSERT INTO course (name, ${TEXT_FIELDS.join(", ")}, status, progress, bookmarked, ai_profile_id, cover, position)
      VALUES (?, ${TEXT_FIELDS.map(() => "?").join(", ")}, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM course))`,
    [
      courseName(input.name),
      ...TEXT_FIELDS.map((key) => input[key]?.trim() || null),
      input.status ?? CompletionStatus.NotStarted,
      clampProgress(input.progress ?? 0),
      input.bookmarked ? 1 : 0,
      input.ai_profile_id ?? null,
      input.cover ?? null
    ]
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
  for (const key of TEXT_FIELDS) {
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
  if (input.ai_profile_id !== undefined) {
    fields.push("ai_profile_id = ?");
    values.push(input.ai_profile_id);
  }
  const replacedCover = input.cover === undefined ? null : (await getCourse(id))?.cover;
  if (input.cover !== undefined) {
    fields.push("cover = ?");
    values.push(input.cover);
  }
  if (fields.length) {
    await desktop.storage.execute(
      `UPDATE course SET ${fields.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
      [...values, id]
    );
  }
  if (replacedCover && replacedCover !== input.cover) await deleteImage(replacedCover);
  const course = await getCourse(id);
  if (!course) throw new Error("This course no longer exists.");
  return course;
}

// Code, semester, school and instructor as one line, skipping empty ones.
export function courseDetails({ code, semester, school, instructor }: Course) {
  return [code, semester, school, instructor].filter(Boolean).join(" · ");
}

// Pinned courses list first, each group in the user's own order.
export function pinnedFirst(courses: Course[]) {
  return {
    pinned: courses.filter((course) => course.bookmarked),
    others: courses.filter((course) => !course.bookmarked)
  };
}

// The whole list with one group (pinned or not) in its new order.
export function withGroupOrder(courses: Course[], group: Course[]) {
  const pinned = group[0]?.bookmarked ?? false;
  const rest = courses.filter((course) => course.bookmarked !== pinned);
  return pinned ? [...group, ...rest] : [...rest, ...group];
}

// `ids` in their new order; every course not listed keeps its position.
export async function reorderCourses(ids: number[]) {
  for (const [position, id] of ids.entries())
    await desktop.storage.execute("UPDATE course SET position = ? WHERE id = ?", [position + 1, id]);
}

export async function deleteCourse(id: number) {
  const cover = (await getCourse(id))?.cover;
  await deletePageCovers("module_id IN (SELECT id FROM module WHERE course_id = ?)", [id]);
  await deleteRecordings(
    "page_id IN (SELECT id FROM page WHERE module_id IN (SELECT id FROM module WHERE course_id = ?))",
    [id]
  );
  await deleteAttachments(
    "page_id IN (SELECT id FROM page WHERE module_id IN (SELECT id FROM module WHERE course_id = ?))",
    [id]
  );
  await deletePageAudios(
    "page_id IN (SELECT id FROM page WHERE module_id IN (SELECT id FROM module WHERE course_id = ?))",
    [id]
  );
  await desktop.storage.execute(
    "DELETE FROM page WHERE module_id IN (SELECT id FROM module WHERE course_id = ?)",
    [id]
  );
  await desktop.storage.execute("DELETE FROM module WHERE course_id = ?", [id]);
  await desktop.storage.execute("DELETE FROM course WHERE id = ?", [id]);
  if (cover) await deleteImage(cover);
}
