import { desktop, sql, type SqlFragment, type Values } from "@chain/sdk";

import type { AttachmentRow } from "../../../../shared/lib/db/schema/attachment";

const attachmentTable = () => desktop.storage.table<AttachmentRow>("attachment");

export async function getAttachment(id: number) {
  return (await attachmentTable().find(id)) ?? null;
}

export function getAttachments(filter: SqlFragment) {
  return attachmentTable().where(filter).all();
}

export async function insertAttachment(
  values: Values<AttachmentRow> & { page_id: number; file_name: string; file_path: string }
) {
  const row = await attachmentTable().insert(values);
  return row.id;
}

export async function setAttachmentName(id: number, fileName: string) {
  await attachmentTable().update(id, { file_name: fileName, updated_at: sql`datetime('now')` });
}

export async function deleteAttachmentRows(filter: SqlFragment) {
  await attachmentTable().delete(filter);
}
