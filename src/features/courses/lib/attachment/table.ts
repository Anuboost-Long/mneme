import { desktop, sql, type SqlFragment, type Values } from "@chain/sdk";

import type { AttachmentRow } from "../../../../shared/lib/db/schema/attachment";
import type { AttachmentLink } from "./types";

const attachmentTable = () => desktop.storage.table<AttachmentRow>("attachment");

export function searchAttachmentLinks(query: string, limit: number) {
  const like = `%${query.trim().replace(/[\\%_]/g, "\\$&")}%`;
  return desktop.storage.query<AttachmentLink>(
    `SELECT attachment.id, attachment.file_name, page.id AS page_id, page.title AS page_title,
       page.module_id, module.course_id
     FROM attachment JOIN page ON page.id = attachment.page_id JOIN module ON module.id = page.module_id
     WHERE page.deleted_at IS NULL AND attachment.file_name LIKE ? ESCAPE '\\'
     ORDER BY attachment.file_name COLLATE NOCASE LIMIT ?`,
    [like, limit]
  );
}

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
