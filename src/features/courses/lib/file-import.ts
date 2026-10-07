import { extractTextFromBytes, recognizeDocument } from "@/shared/lib/ocr";
import { readPdf } from "@/shared/lib/pdf";
import mammoth from "mammoth";
import { marked } from "marked";

import {
  detectType,
  escapeAttr,
  escapeHtml,
  sanitizeChildren,
  type ParsedImport
} from "./import-sanitize";
import { pageImage } from "./page-image";
import { PageType } from "./page/types";
import { pdfPagesToHtml } from "./pdf-structure";
import { recognizedBlocks } from "./recognized-document";

export type ImportableFileKind = "markdown" | "docx" | "pdf" | "text" | "image" | "audio" | "video";

const kindsOf = (kind: ImportableFileKind, extensions: string) =>
  Object.fromEntries(extensions.split(" ").map((extension) => [extension, kind]));

const EXTENSION_KINDS: Record<string, ImportableFileKind> = {
  ...kindsOf("markdown", "md markdown"),
  ...kindsOf("docx", "docx"),
  ...kindsOf("pdf", "pdf"),
  ...kindsOf("text", "txt"),
  ...kindsOf("image", "png jpg jpeg webp gif"),
  ...kindsOf("audio", "m4a mp3 wav aiff aif flac ogg opus caf"),
  ...kindsOf("video", "mp4 m4v mov webm mkv")
};

export const IMPORTABLE_FILE_EXTENSIONS = Object.keys(EXTENSION_KINDS);

export function fileImportKind(file: File): ImportableFileKind | undefined {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? EXTENSION_KINDS[extension] : undefined;
}

function titleFromFilename(name: string): string {
  const withoutExtension = name.replace(/\.[^./]+$/, "");
  const spaced = withoutExtension.replace(/[-_]+/g, " ").trim();
  return spaced || "Imported page";
}

// Markdown and DOCX both produce full HTML strings from a library we don't
// control the output of — reusing the same allowlist sanitizeChildren()
// applies to fetched web pages keeps one definition of "safe HTML this app
// will store", rather than trusting each converter's output differently.
function sanitizeHtmlFragment(html: string, storedImages?: ReadonlySet<string>): string {
  const doc = new DOMParser().parseFromString(
    /<html/i.test(html) ? html : `<html><body>${html}</body></html>`,
    "text/html"
  );
  return sanitizeChildren(doc.body, undefined, storedImages);
}

async function parseMarkdownFile(file: File): Promise<ParsedImport> {
  const text = await file.text();
  const rawHtml = await marked.parse(text);
  const title = titleFromFilename(file.name);
  return { title, type: detectType(title), html: sanitizeHtmlFragment(rawHtml) };
}

async function parseDocxFile(file: File): Promise<ParsedImport> {
  const arrayBuffer = await file.arrayBuffer();
  const storedImages = new Set<string>();
  const { value: rawHtml } = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      // Stored as files like pasted images rather than inlined as data
      // URLs. A format pageImage can't read (EMF, TIFF) is left out.
      convertImage: mammoth.images.imgElement(async (image) => {
        const imageFile = new File([await image.readAsArrayBuffer()], "docx-image", {
          type: image.contentType
        });
        const src = await pageImage(imageFile).catch(() => "");
        if (src) storedImages.add(src);
        return { src };
      })
    }
  );
  const title = titleFromFilename(file.name);
  return { title, type: detectType(title), html: sanitizeHtmlFragment(rawHtml, storedImages) };
}

async function parsePdfFile(file: File): Promise<ParsedImport> {
  const { pages, title: metaTitle } = await readPdf(await file.arrayBuffer(), {
    images: true,
    recognize: recognizeDocument
  });
  const { html, title: headingTitle } = pdfPagesToHtml(
    await Promise.all(
      pages.map(async ({ images, ...page }) => ({
        ...page,
        images: await Promise.all(
          images.map(async ({ top, png, covers }) => ({
            top,
            covers,
            src: await pageImage(new File([png], "pdf-image.png", { type: "image/png" }))
          }))
        )
      }))
    )
  );
  const title =
    headingTitle ||
    (isPlaceholderTitle(metaTitle) ? "" : metaTitle) ||
    titleFromFilename(file.name);
  return { title, type: detectType(title), html };
}

function isPlaceholderTitle(title: string | undefined): boolean {
  return !title || !/\s/.test(title.trim()) || /^microsoft \w+ - /i.test(title);
}

const MAX_PLAIN_HEADING_WORDS = 8;

function isPlainHeading(line: string, next: string | undefined) {
  return (
    line.split(/\s+/).length <= MAX_PLAIN_HEADING_WORDS &&
    !/[.!?,;:]$/.test(line) &&
    /[.!?]$/.test(next ?? "")
  );
}

export function textToHtml(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const paragraphs = lines
    .map((line, index) =>
      isPlainHeading(line, lines[index + 1])
        ? `<h3>${escapeHtml(line)}</h3>`
        : `<p>${escapeHtml(line)}</p>`
    )
    .join("");
  return sanitizeHtmlFragment(paragraphs);
}

async function parseTextFile(file: File): Promise<ParsedImport> {
  const title = titleFromFilename(file.name);
  return { title, type: detectType(title), html: textToHtml(await file.text()) };
}

async function pictureText(bytes: Uint8Array) {
  const recognized = await recognizeDocument(bytes).catch(() => null);
  if (recognized)
    return recognizedBlocks(recognized)
      .map((block) => block.html)
      .join("");
  const { text } = await extractTextFromBytes(bytes).catch(() => ({ text: "" }));
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

async function parseImageFile(file: File): Promise<ParsedImport> {
  const title = titleFromFilename(file.name);
  const src = await pageImage(file);
  const text = await pictureText(new Uint8Array(await file.arrayBuffer()));
  const textSection = text ? "<h2>Text in the picture</h2>" + text : "";
  const html = `<img src="${escapeAttr(src)}" alt="${escapeAttr(title)}">${textSection}`;
  return { title, type: detectType(title), html };
}

function mediaImport(file: File, kind: "audio" | "video"): ParsedImport {
  return {
    title: titleFromFilename(file.name),
    type: PageType.Lecture,
    html: "",
    media: { kind, file }
  };
}

export async function parseImportFile(file: File): Promise<ParsedImport> {
  switch (fileImportKind(file)) {
    case "markdown":
      return parseMarkdownFile(file);
    case "docx":
      return parseDocxFile(file);
    case "pdf":
      return parsePdfFile(file);
    case "text":
      return parseTextFile(file);
    case "image":
      return parseImageFile(file);
    case "audio":
      return mediaImport(file, "audio");
    case "video":
      return mediaImport(file, "video");
    default:
      throw new Error(
        `Can’t import “${file.name}”. Choose a PDF, Word, Markdown or text file, a picture, an audio file or a video.`
      );
  }
}

export function pastedImport(text: string, html: string): ParsedImport {
  const firstLine = text.split("\n")[0].trim();
  const title = firstLine.length <= 80 ? firstLine : "Pasted text";
  return {
    title,
    type: detectType(title),
    html: html ? sanitizeHtmlFragment(html) : textToHtml(text)
  };
}
