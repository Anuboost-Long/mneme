import { fileExtension, storePageFile } from "@/features/courses/lib/page-files";
import { desktop, sql, type SqlFragment } from "@chain/sdk";

import {
  deleteAttachmentRows,
  getAttachment,
  getAttachments,
  insertAttachment,
  setAttachmentName
} from "./table";
import type { Attachment } from "./types";

export { getAttachment, getPageAttachments, searchAttachmentLinks } from "./table";

export async function createAttachment(pageId: number, file: File) {
  const reference = await storePageFile(file);
  return insertAttachment({
    page_id: pageId,
    file_name: file.name,
    file_path: reference,
    mime_type: file.type || null,
    size_bytes: file.size
  });
}

export async function renameAttachment(attachment: Attachment, name: string) {
  const extension = fileExtension(attachment.file_name);
  let fileName = name.trim();
  if (!fileName) throw new Error("Enter a file name.");
  if (extension && fileExtension(fileName) !== extension) fileName = `${fileName}.${extension}`;
  await setAttachmentName(attachment.id, fileName);
  return fileName;
}

export async function deleteAttachment(id: number) {
  await deleteAttachments(sql`id = ${id}`);
}

export async function deleteAttachments(filter: SqlFragment) {
  for (const { file_path } of await getAttachments(filter))
    await desktop.files.delete(file_path).catch(() => undefined);
  await deleteAttachmentRows(filter);
}

export async function copyAttachments(content: string, pageId: number) {
  let copied = content;
  const ids = new Set(
    Array.from(content.matchAll(/data-attachment-id="(\d+)"/g), (match) => Number(match[1]))
  );
  for (const id of ids) {
    const attachment = await getAttachment(id);
    if (!attachment) continue;
    const extension = fileExtension(attachment.file_name);
    const reference = await desktop.files.write(
      await desktop.files.read(attachment.file_path),
      extension ? { extension } : undefined
    );
    const copyId = await insertAttachment({
      page_id: pageId,
      file_name: attachment.file_name,
      file_path: reference,
      mime_type: attachment.mime_type,
      size_bytes: attachment.size_bytes
    });
    copied = copied.split(`data-attachment-id="${id}"`).join(`data-attachment-id="${copyId}"`);
  }
  return copied;
}

export async function openAttachment(attachment: Attachment) {
  try {
    await desktop.files.open(attachment.file_path);
  } catch (error) {
    if ((error as { code?: string } | null)?.code === "UNSUPPORTED")
      throw new Error(
        "This file can run programs, so mneme won’t open it. Use Show in Finder to decide for yourself."
      );
    throw error;
  }
}

export function revealAttachment(attachment: Attachment) {
  return desktop.files.reveal(attachment.file_path);
}

export async function saveAttachmentCopy(attachment: Attachment) {
  const extension = fileExtension(attachment.file_name);
  const bytes = await desktop.files.read(attachment.file_path);
  return desktop.files.save(bytes, {
    suggestedName: attachment.file_name,
    extensions: extension ? [extension] : undefined
  });
}

const textExtensions = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "xml",
  "yaml",
  "yml",
  "html",
  "htm",
  "tex",
  "rtf"
]);
const maxTextBytes = 200_000;

export async function readAttachmentText(attachment: Attachment): Promise<string | null> {
  const isText =
    attachment.mime_type?.startsWith("text/") ||
    textExtensions.has(fileExtension(attachment.file_name) ?? "");
  if (!isText || (attachment.size_bytes ?? 0) > maxTextBytes) return null;
  try {
    return new TextDecoder().decode(await desktop.files.read(attachment.file_path));
  } catch {
    return null;
  }
}
