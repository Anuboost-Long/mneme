import { desktop, sql, type Values } from "@chain/sdk";

import type { AttachmentRow } from "../../../../shared/lib/db/schema/attachment";
import type { CourseRow } from "../../../../shared/lib/db/schema/course";
import type { ModuleRow } from "../../../../shared/lib/db/schema/module";
import type { PageRow } from "../../../../shared/lib/db/schema/page";
import type { RecordingRow } from "../../../../shared/lib/db/schema/recording";

const livePageIds = sql`page_id IN (SELECT id FROM page WHERE deleted_at IS NULL)`;

export function getBackupRows() {
  return Promise.all([
    desktop.storage.table<CourseRow>("course").where({ deleted_at: null }).orderBy("id").all(),
    desktop.storage.table<ModuleRow>("module").where({ deleted_at: null }).orderBy("id").all(),
    desktop.storage.table<PageRow>("page").where({ deleted_at: null }).orderBy("id").all(),
    desktop.storage.table<AttachmentRow>("attachment").where(livePageIds).orderBy("id").all(),
    desktop.storage.table<RecordingRow>("recording").where(livePageIds).orderBy("id").all()
  ]);
}

type RestoredTable = "course" | "module" | "page";

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

export async function insertRecordingRow(
  values: Values<RecordingRow> &
    Pick<RecordingRow, "page_id" | "name" | "file_reference" | "mime_type" | "duration_ms">
) {
  return (await desktop.storage.table<RecordingRow>("recording").insert(values)).id;
}
