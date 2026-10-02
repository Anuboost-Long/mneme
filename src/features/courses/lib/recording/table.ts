import { desktop, sql, type SqlFragment, type Values } from "@chain/sdk";

import type { RecordingRow } from "../../../../shared/lib/db/schema/recording";
import type { RecordingListItem } from "./types";

const recordingTable = () => desktop.storage.table<RecordingRow>("recording");

export function getRecording(id: number) {
  return recordingTable().find(id);
}

export function getRecordings(filter: SqlFragment) {
  return recordingTable().where(filter).all();
}

export function getAllRecordings() {
  return desktop.storage.query<RecordingListItem>(
    `SELECT recording.*, page.title AS page_title, page.module_id, module.name AS module_name,
       module.course_id, course.name AS course_name, course.color AS course_color
     FROM recording JOIN page ON page.id = recording.page_id JOIN module ON module.id = page.module_id
     JOIN course ON course.id = module.course_id
     WHERE page.deleted_at IS NULL
     ORDER BY recording.created_at DESC, recording.id DESC`,
    []
  );
}

export function insertRecording(
  values: Values<RecordingRow> & {
    page_id: number;
    name: string;
    file_reference: string;
    mime_type: string;
    duration_ms: number;
  }
) {
  return recordingTable().insert(values);
}

export async function updateRecordingColumns(id: number, changes: Values<RecordingRow>) {
  await recordingTable().update(id, { ...changes, updated_at: sql`datetime('now')` });
}

export async function deleteRecordingRows(filter: SqlFragment) {
  await recordingTable().delete(filter);
}
