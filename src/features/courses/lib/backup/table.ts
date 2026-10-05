import { desktop, sql, type Values } from "@chain/sdk";

import type { AttachmentRow } from "../../../../shared/lib/db/schema/attachment";
import type { CourseRow } from "../../../../shared/lib/db/schema/course";
import type { CustomPageTypeRow } from "../../../../shared/lib/db/schema/custom-page-type";
import type { FlashcardRow } from "../../../../shared/lib/db/schema/flashcard";
import type { HomeLayoutRow } from "../../../../shared/lib/db/schema/home-layout";
import type { HomeWidgetRow } from "../../../../shared/lib/db/schema/home-widget";
import type { ModuleRow } from "../../../../shared/lib/db/schema/module";
import type { PageRow } from "../../../../shared/lib/db/schema/page";
import type { RecordingRow } from "../../../../shared/lib/db/schema/recording";
import type { TaskRow } from "../../../../shared/lib/db/schema/task";

const livePageIds = sql`page_id IN (SELECT id FROM page WHERE deleted_at IS NULL)`;

export function getBackupRows() {
  return Promise.all([
    desktop.storage.table<CourseRow>("course").where({ deleted_at: null }).orderBy("id").all(),
    desktop.storage.table<ModuleRow>("module").where({ deleted_at: null }).orderBy("id").all(),
    desktop.storage.table<PageRow>("page").where({ deleted_at: null }).orderBy("id").all(),
    desktop.storage.table<AttachmentRow>("attachment").where(livePageIds).orderBy("id").all(),
    desktop.storage
      .table<RecordingRow>("recording")
      .where(sql`page_id IS NULL OR ${livePageIds}`)
      .orderBy("id")
      .all(),
    desktop.storage.table<HomeWidgetRow>("home_widget").orderBy("position", "id").all(),
    desktop.storage.table<HomeLayoutRow>("home_layout").orderBy("id").all(),
    desktop.storage.table<CustomPageTypeRow>("custom_page_type").orderBy("id").all(),
    desktop.storage
      .table<FlashcardRow>("flashcard")
      .where(sql`module_id IN (SELECT id FROM module WHERE deleted_at IS NULL) AND (page_id IS NULL OR ${livePageIds})`)
      .orderBy("id")
      .all(),
    desktop.storage
      .table<TaskRow>("task")
      .where(
        sql`(course_id IS NULL OR course_id IN (SELECT id FROM course WHERE deleted_at IS NULL))
          AND (module_id IS NULL OR module_id IN (SELECT id FROM module WHERE deleted_at IS NULL))`
      )
      .orderBy("id")
      .all()
  ]);
}

export async function hasHomeWidgets() {
  return !!(await desktop.storage.table<HomeWidgetRow>("home_widget").first());
}

export async function insertHomeWidgets(rows: HomeWidgetRow[]) {
  const table = desktop.storage.table<HomeWidgetRow>("home_widget");
  for (const [position, { kind, size, config }] of rows.entries()) await table.insert({ kind, size, config, position });
}

type RestoredTable = "course" | "module" | "page" | "home_layout" | "custom_page_type" | "flashcard" | "task";

export async function insertIfMissing(table: RestoredTable, values: Record<string, unknown>) {
  const columns = Object.keys(values);
  const { rowsAffected } = await desktop.storage.execute(
    `INSERT OR IGNORE INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    Object.values(values)
  );
  return rowsAffected > 0;
}

export async function setRestoredColumns(
  table: RestoredTable,
  id: number,
  values: Values<CourseRow & ModuleRow & PageRow>
) {
  await desktop.storage.table<CourseRow & ModuleRow & PageRow>(table).update(id, values);
}

export async function insertAttachmentRow(
  values: Values<AttachmentRow> & Pick<AttachmentRow, "page_id" | "file_name" | "file_path">
) {
  return (await desktop.storage.table<AttachmentRow>("attachment").insert(values)).id;
}

export async function hasRecording(name: string, createdAt: string) {
  return !!(await desktop.storage
    .table<RecordingRow>("recording")
    .where({ name, created_at: createdAt })
    .first());
}

export async function insertRecordingRow(
  values: Values<RecordingRow> &
    Pick<RecordingRow, "page_id" | "name" | "file_reference" | "mime_type" | "duration_ms">
) {
  return (await desktop.storage.table<RecordingRow>("recording").insert(values)).id;
}
