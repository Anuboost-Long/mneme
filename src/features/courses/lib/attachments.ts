import { desktop } from "@chain/sdk";

import type { AttachmentRow } from "../../../shared/lib/db";
import { fileExtension, storePageFile } from "./page-files";

export type Attachment = AttachmentRow;

export async function getAttachment(id: number): Promise<Attachment | null> {
  const [row] = await desktop.storage.query<Attachment>("SELECT * FROM attachment WHERE id = ?", [id]);
  return row ?? null;
}

export async function createAttachment(pageId: number, file: File): Promise<number> {
  const reference = await storePageFile(file);
  const result = await desktop.storage.execute(
    "INSERT INTO attachment (page_id, file_name, file_path, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)",
    [pageId, file.name, reference, file.type || null, file.size]
  );
  return Number(result.lastInsertId);
}

// The extension stays as it was: it's what tells the OS which app opens it.
export async function renameAttachment(attachment: Attachment, name: string) {
  const extension = fileExtension(attachment.file_name);
  let fileName = name.trim();
  if (!fileName) throw new Error("Enter a file name.");
  if (extension && fileExtension(fileName) !== extension) fileName = `${fileName}.${extension}`;
  await desktop.storage.execute("UPDATE attachment SET file_name = ?, updated_at = datetime('now') WHERE id = ?", [fileName, attachment.id]);
  return fileName;
}

export async function deleteAttachment(id: number) {
  await deleteAttachments("id = ?", [id]);
}

// Like deleteRecordings: files go first, since the database can't delete
// them, then the rows. Page, module and course deletes call this.
export async function deleteAttachments(filter: string, params: unknown[]) {
  const rows = await desktop.storage.query<{ file_path: string }>(`SELECT file_path FROM attachment WHERE ${filter}`, params);
  for (const { file_path } of rows) await desktop.files.delete(file_path).catch(() => undefined);
  await desktop.storage.execute(`DELETE FROM attachment WHERE ${filter}`, params);
}

// A duplicated page gets its own copy of each attachment, so deleting
// either page leaves the other whole.
export async function copyAttachments(content: string, pageId: number) {
  let copied = content;
  const ids = new Set(Array.from(content.matchAll(/data-attachment-id="(\d+)"/g), (match) => Number(match[1])));
  for (const id of ids) {
    const attachment = await getAttachment(id);
    if (!attachment) continue;
    const extension = fileExtension(attachment.file_name);
    const reference = await desktop.files.write(await desktop.files.read(attachment.file_path), extension ? { extension } : undefined);
    const result = await desktop.storage.execute(
      "INSERT INTO attachment (page_id, file_name, file_path, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)",
      [pageId, attachment.file_name, reference, attachment.mime_type, attachment.size_bytes]
    );
    copied = copied.split(`data-attachment-id="${id}"`).join(`data-attachment-id="${result.lastInsertId}"`);
  }
  return copied;
}

// Opens in the app the OS picks for the file's extension. Files that can
// run code are refused by chain-sdk: stored files carry no quarantine, so
// macOS wouldn't warn before running one.
export async function openAttachment(attachment: Attachment) {
  try {
    await desktop.files.open(attachment.file_path);
  } catch (error) {
    if ((error as { code?: string } | null)?.code === "UNSUPPORTED")
      throw new Error("This file can run programs, so mneme won’t open it. Use Show in Finder to decide for yourself.");
    throw error;
  }
}

export function revealAttachment(attachment: Attachment) {
  return desktop.files.reveal(attachment.file_path);
}

export async function saveAttachmentCopy(attachment: Attachment) {
  const extension = fileExtension(attachment.file_name);
  const bytes = await desktop.files.read(attachment.file_path);
  return desktop.files.save(bytes, { suggestedName: attachment.file_name, extensions: extension ? [extension] : undefined });
}
