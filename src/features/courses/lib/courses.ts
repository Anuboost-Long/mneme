import { desktop, sql, type Values } from "@chain/sdk";

import { savePositions } from "../../../shared/lib/db/positions";
import type { CourseRow } from "../../../shared/lib/db/schema/course";
import type { ModuleRow } from "../../../shared/lib/db/schema/module";
import type { PageRow } from "../../../shared/lib/db/schema/page";
import { CompletionStatus } from "./completion-status";
import { deleteIcon, deleteReplacedIcon, storeIcon } from "./course-image";
import { deleteImage } from "./page-image";
import { deletionTime } from "./pages";
import { eraseModules } from "./modules";

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

const courseTable = () => desktop.storage.table<CourseRow>("course");

function toCourse(row: CourseRow): Course {
  return { ...row, status: row.status as CompletionStatus, bookmarked: Boolean(row.bookmarked) };
}

export async function getCourses(filter: CourseFilter = {}) {
  let query = courseTable().where({
    deleted_at: null,
    status: filter.status,
    bookmarked: filter.bookmarked === undefined ? undefined : Number(filter.bookmarked)
  });
  if (filter.createdFrom !== undefined) query = query.where(sql`date(created_at) >= date(${filter.createdFrom})`);
  if (filter.createdTo !== undefined) query = query.where(sql`date(created_at) <= date(${filter.createdTo})`);
  const rows = await query.orderBy("position", "created_at", "id").all();
  return rows.map(toCourse);
}

export async function getCourse(id: number) {
  const row = await courseTable().where({ id, deleted_at: null }).first();
  return row ? toCourse(row) : undefined;
}

// New courses go to the end of the list.
export async function createCourse(input: CourseInput) {
  const row = await courseTable().insert({
    name: courseName(input.name),
    ...Object.fromEntries(TEXT_FIELDS.map((key) => [key, input[key]?.trim() || null])),
    icon: await storeIcon(input.icon),
    status: input.status ?? CompletionStatus.NotStarted,
    progress: clampProgress(input.progress ?? 0),
    bookmarked: input.bookmarked ? 1 : 0,
    ai_profile_id: input.ai_profile_id ?? null,
    cover: input.cover ?? null,
    position: sql`SELECT COALESCE(MAX(position), 0) + 1 FROM course`
  });
  return toCourse(row);
}

export async function updateCourse(id: number, input: Partial<CourseInput>) {
  const changes: Values<CourseRow> = {
    name: input.name === undefined ? undefined : courseName(input.name),
    ...Object.fromEntries(TEXT_FIELDS.map((key) => [key, input[key] === undefined ? undefined : input[key]?.trim() || null])),
    icon: input.icon === undefined ? undefined : await storeIcon(input.icon),
    status: input.status,
    progress: input.progress === undefined ? undefined : clampProgress(input.progress),
    bookmarked: input.bookmarked === undefined ? undefined : Number(input.bookmarked),
    ai_profile_id: input.ai_profile_id,
    cover: input.cover
  };
  const edited = Object.values(changes).some((value) => value !== undefined);
  const previous = input.cover === undefined && input.icon === undefined ? undefined : await getCourse(id);
  const replacedCover = input.cover === undefined ? null : previous?.cover;
  const [row] = await courseTable().update({ id, deleted_at: null }, edited ? { ...changes, updated_at: sql`datetime('now')` } : {});
  if (replacedCover && replacedCover !== input.cover) await deleteImage(replacedCover);
  if (row && changes.icon !== undefined) await deleteReplacedIcon(previous?.icon, row.icon);
  if (!row) throw new Error("This course no longer exists.");
  return toCourse(row);
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
  await savePositions("course", ids);
}

export async function deleteCourse(id: number) {
  const deletedAt = deletionTime();
  await desktop.storage.transaction(async (tx) => {
    await tx.table<PageRow>("page").update(
      sql`deleted_at IS NULL AND module_id IN (SELECT id FROM module WHERE course_id = ${id})`,
      { deleted_at: deletedAt }
    );
    await tx.table<ModuleRow>("module").update({ course_id: id, deleted_at: null }, { deleted_at: deletedAt });
    await tx.table<CourseRow>("course").update({ id, deleted_at: null }, { deleted_at: deletedAt });
  });
}

export async function eraseCourse(id: number) {
  const row = await courseTable().find(id);
  await eraseModules("course_id = ?", [id]);
  await courseTable().delete(id);
  if (row?.cover) await deleteImage(row.cover);
  await deleteIcon(row?.icon);
}
