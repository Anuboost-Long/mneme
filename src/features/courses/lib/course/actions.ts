import { CompletionStatus } from "@/features/courses/lib/completion-status";
import { deleteIcon, deleteReplacedIcon, storeIcon } from "@/features/courses/lib/icon/actions";
import { eraseModules } from "@/features/courses/lib/module/actions";
import { deleteImage } from "@/features/courses/lib/page-image";
import { deletionTime } from "@/features/courses/lib/page/actions";
import type { CourseRow } from "@/shared/lib/db/schema/course";
import { sql, type Values } from "@chain/sdk";

import {
  deleteCourseRow,
  getCourse,
  getCourseRowIncludingDeleted,
  insertCourse,
  saveCoursePositions,
  softDeleteCourse,
  updateCourseColumns
} from "./table";
import type { CourseInput } from "./types";

export { getCourse, getCourses } from "./table";

const TEXT_FIELDS = [
  "description",
  "icon",
  "color",
  "code",
  "semester",
  "school",
  "instructor"
] as const;

function courseName(name: string) {
  if (!name.trim()) throw new Error("Enter a course name.");
  return name.trim();
}

function clampProgress(progress: number) {
  return Math.min(100, Math.max(0, Math.round(progress)));
}

export async function createCourse(input: CourseInput) {
  return insertCourse({
    name: courseName(input.name),
    ...Object.fromEntries(TEXT_FIELDS.map((key) => [key, input[key]?.trim() || null])),
    icon: await storeIcon(input.icon),
    status: input.status ?? CompletionStatus.NotStarted,
    progress: clampProgress(input.progress ?? 0),
    bookmarked: input.bookmarked ? 1 : 0,
    ai_profile_id: input.ai_profile_id ?? null,
    cover: input.cover ?? null
  });
}

export async function updateCourse(id: number, input: Partial<CourseInput>) {
  const changes: Values<CourseRow> = {
    name: input.name === undefined ? undefined : courseName(input.name),
    ...Object.fromEntries(
      TEXT_FIELDS.map((key) => [
        key,
        input[key] === undefined ? undefined : input[key]?.trim() || null
      ])
    ),
    icon: input.icon === undefined ? undefined : await storeIcon(input.icon),
    status: input.status,
    progress: input.progress === undefined ? undefined : clampProgress(input.progress),
    bookmarked: input.bookmarked === undefined ? undefined : Number(input.bookmarked),
    ai_profile_id: input.ai_profile_id,
    cover: input.cover
  };
  const previous =
    input.cover === undefined && input.icon === undefined ? undefined : await getCourse(id);
  const replacedCover = input.cover === undefined ? null : previous?.cover;
  const course = await updateCourseColumns(id, changes);
  if (replacedCover && replacedCover !== input.cover) await deleteImage(replacedCover);
  if (course && changes.icon !== undefined) await deleteReplacedIcon(previous?.icon, course.icon);
  if (!course) throw new Error("This course no longer exists.");
  return course;
}

export async function reorderCourses(ids: number[]) {
  await saveCoursePositions(ids);
}

export async function deleteCourse(id: number) {
  await softDeleteCourse(id, deletionTime());
}

export async function eraseCourse(id: number) {
  const row = await getCourseRowIncludingDeleted(id);
  await eraseModules(sql`course_id = ${id}`);
  await deleteCourseRow(id);
  if (row?.cover) await deleteImage(row.cover);
  await deleteIcon(row?.icon);
}
