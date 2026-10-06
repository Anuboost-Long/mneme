import { getPageAttachments, readAttachmentText } from "@/features/courses/lib/attachment/actions";
import type { Attachment } from "@/features/courses/lib/attachment/types";
import type { Page } from "@/features/courses/lib/page/types";
import { getPageRecordings } from "@/features/courses/lib/recording/actions";
import { transcribeError, transcribeRecording } from "@/features/courses/lib/transcription";
import { extractImages } from "@/shared/lib/htmlImages";
import { extractTextFromBytes } from "@/shared/lib/ocr";
import { readPdf } from "@/shared/lib/pdf";
import { desktop } from "@chain/sdk";
import mammoth from "mammoth";

export type PageMaterial = { id: number; title: string; text: string };

export type Material = { pages: PageMaterial[]; unread: string[] };

export type ReadingProgress = (detail: string, done: number, total: number) => void;

const BLOCK_END = /<\/(p|h[1-6]|li|tr|blockquote|pre|div|figcaption)>|<br\s*\/?>/gi;

export function htmlText(html: string) {
  const document = new DOMParser().parseFromString(
    `<html><body>${html.replace(/\s+/g, " ").replace(BLOCK_END, "$&\n")}</body></html>`,
    "text/html"
  );
  return (document.body.textContent ?? "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export function fingerprint(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++)
    hash = Math.imul(hash ^ (text.codePointAt(index) ?? 0), 16777619);
  return `${text.length}:${hash >>> 0}`;
}

const extension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

async function documentText(attachment: Attachment) {
  const plain = await readAttachmentText(attachment);
  if (plain !== null) return plain;
  const kind = extension(attachment.file_name);
  if (kind !== "pdf" && kind !== "docx") return null;
  const bytes = await desktop.files.read(attachment.file_path);
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  if (kind === "docx") return (await mammoth.extractRawText({ arrayBuffer: buffer })).value;
  const { pages } = await readPdf(buffer);
  return pages
    .map((page) => page.runs.map((run) => run.str + (run.hasEOL ? "\n" : "")).join(""))
    .join("\n\n");
}

async function pictureText(html: string) {
  const { html: marked, images } = await extractImages(html);
  const texts: string[] = [];
  for (const [index, image] of images.entries()) {
    const text = await extractTextFromBytes(image.bytes).then(
      (result) => result.text.trim(),
      () => ""
    );
    if (text) texts.push(`[Text in image ${index + 1}]\n${text}`);
  }
  return { html: marked, texts };
}

async function readPage(
  page: Page,
  unread: string[],
  onTranscribing: (name: string, progress: number) => void
) {
  const { html, texts } = await pictureText(page.content ?? "");
  const parts = [htmlText(html), ...texts];
  for (const attachment of await getPageAttachments(page.id)) {
    try {
      const text = (await documentText(attachment))?.trim();
      if (text) parts.push(`[Attached file: ${attachment.file_name}]\n${text}`);
      else
        unread.push(
          `${attachment.file_name} on “${page.title}”: mneme can’t read this kind of file yet.`
        );
    } catch {
      unread.push(`${attachment.file_name} on “${page.title}”: the file couldn’t be opened.`);
    }
  }
  for (const recording of await getPageRecordings(page.id)) {
    let transcript = recording.transcript?.trim() ?? "";
    if (!transcript)
      try {
        transcript = (
          await transcribeRecording(recording, (progress) =>
            onTranscribing(recording.name, progress)
          )
        ).trim();
      } catch (error) {
        unread.push(`${recording.name} on “${page.title}”: ${transcribeError(error)}`);
      }
    if (transcript && !parts[0].includes(transcript.slice(0, 200)))
      parts.push(`[Recording: ${recording.name}]\n${transcript}`);
  }
  return parts.filter(Boolean).join("\n\n");
}

export async function readMaterial(
  pages: Page[],
  onProgress: ReadingProgress,
  stopped: () => boolean
): Promise<Material> {
  const unread: string[] = [];
  const read: PageMaterial[] = [];
  for (const [index, page] of pages.entries()) {
    if (stopped()) break;
    onProgress(`Reading the material · page ${index + 1} of ${pages.length}`, index, pages.length);
    const text = await readPage(page, unread, (name, progress) =>
      onProgress(
        `Transcribing ${name} · ${Math.round(progress * 100)}%`,
        index + progress,
        pages.length
      )
    );
    if (text) read.push({ id: page.id, title: page.title, text });
  }
  return { pages: read, unread };
}
