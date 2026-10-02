import { desktop, sql, type Values } from "@chain/sdk";

import { savePositions } from "../../../../shared/lib/db/positions";
import type { CourseRow } from "../../../../shared/lib/db/schema/course";
import type { ModuleRow } from "../../../../shared/lib/db/schema/module";
import type { PageRow } from "../../../../shared/lib/db/schema/page";
import type { CompletionStatus } from "../completion-status";
import type { Course, CourseFilter } from "./types";

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
  if (filter.createdFrom !== undefined)
    query = query.where(sql`date(created_at) >= date(${filter.createdFrom})`);
  if (filter.createdTo !== undefined)
    query = query.where(sql`date(created_at) <= date(${filter.createdTo})`);
  const rows = await query.orderBy("position", "created_at", "id").all();
  return rows.map(toCourse);
}

export async function getCourse(id: number) {
  const row = await courseTable().where({ id, deleted_at: null }).first();
  return row ? toCourse(row) : undefined;
}

export function getCourseRowIncludingDeleted(id: number) {
  return courseTable().find(id);
}

export async function insertCourse(values: Omit<Values<CourseRow>, "position"> & { name: string }) {
  const row = await courseTable().insert({
    ...values,
    position: sql`SELECT COALESCE(MAX(position), 0) + 1 FROM course`
  });
  return toCourse(row);
}

export async function updateCourseColumns(id: number, changes: Values<CourseRow>) {
  const edited = Object.values(changes).some((value) => value !== undefined);
  const [row] = await courseTable().update(
    { id, deleted_at: null },
    edited ? { ...changes, updated_at: sql`datetime('now')` } : {}
  );
  return row ? toCourse(row) : undefined;
}

export function saveCoursePositions(ids: number[]) {
  return savePositions("course", ids);
}

export function softDeleteCourse(id: number, deletedAt: string) {
  return desktop.storage.transaction(async (tx) => {
    await tx
      .table<PageRow>("page")
      .update(
        sql`deleted_at IS NULL AND module_id IN (SELECT id FROM module WHERE course_id = ${id})`,
        { deleted_at: deletedAt }
      );
    await tx
      .table<ModuleRow>("module")
      .update({ course_id: id, deleted_at: null }, { deleted_at: deletedAt });
    await tx.table<CourseRow>("course").update({ id, deleted_at: null }, { deleted_at: deletedAt });
  });
}

export async function deleteCourseRow(id: number) {
  await courseTable().delete(id);
}
