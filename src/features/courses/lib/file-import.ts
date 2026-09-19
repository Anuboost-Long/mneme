import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";
import { marked } from "marked";
import { detectType, sanitizeChildren, type ParsedImport } from "./import-sanitize";
import { pdfPagesToHtml, type PdfTextRun } from "./pdf-structure";

// pdf.js does its actual parsing on a worker thread; Vite's `?url` import
// gives it a real, hashed, cache-busted URL to that worker script instead
// of the CDN URL it defaults to (which would need network access this app
// otherwise never asks for).
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type ImportableFileKind = "markdown" | "docx" | "pdf";

const EXTENSION_KINDS: Record<string, ImportableFileKind> = {
  md: "markdown",
  markdown: "markdown",
  docx: "docx",
  pdf: "pdf",
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
function sanitizeHtmlFragment(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return sanitizeChildren(doc.body);
}

async function parseMarkdownFile(file: File): Promise<ParsedImport> {
  const text = await file.text();
  const rawHtml = await marked.parse(text);
  const title = titleFromFilename(file.name);
  return { title, type: detectType(title), html: sanitizeHtmlFragment(rawHtml) };
}

async function parseDocxFile(file: File): Promise<ParsedImport> {
  const arrayBuffer = await file.arrayBuffer();
  const { value: rawHtml } = await mammoth.convertToHtml({ arrayBuffer });
  const title = titleFromFilename(file.name);
  return { title, type: detectType(title), html: sanitizeHtmlFragment(rawHtml) };
}

// pdf.js's own `getTextContent()` reads its internal stream via
// `for await (const value of readableStream)`, which some WebKit builds —
// confirmed live in this app's actual Tauri window on macOS — don't
// support on ReadableStream (`TypeError: undefined is not a function
// (near '...value of readableStream...')`). `getReader()`/`read()` is the
// older, universally-supported way to drain a stream, so draining it
// manually here sidesteps that gap entirely instead of depending on a
// runtime feature this webview doesn't have.
type PdfTextContentChunk = { items: unknown[] };

function isTextRun(item: unknown): item is PdfTextRun {
  return typeof item === "object" && item !== null && typeof (item as { str?: unknown }).str === "string";
}

async function readTextContent(page: pdfjsLib.PDFPageProxy): Promise<PdfTextRun[]> {
  const reader = (page.streamTextContent({}) as ReadableStream<PdfTextContentChunk>).getReader();
  const items: PdfTextRun[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    for (const item of value.items) if (isTextRun(item)) items.push(item);
  }
  return items;
}

async function parsePdfFile(file: File): Promise<ParsedImport> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pagesOfItems: PdfTextRun[][] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    pagesOfItems.push(await readTextContent(await pdf.getPage(pageNumber)));
  }
  const html = pdfPagesToHtml(pagesOfItems);
  const metadata = await pdf.getMetadata().catch(() => undefined);
  const metaTitle = (metadata?.info as { Title?: string } | undefined)?.Title?.trim();
  const title = metaTitle || titleFromFilename(file.name);
  return { title, type: detectType(title), html };
}

export async function parseImportFile(file: File): Promise<ParsedImport> {
  const kind = fileImportKind(file);
  if (kind === "markdown") return parseMarkdownFile(file);
  if (kind === "docx") return parseDocxFile(file);
  if (kind === "pdf") return parsePdfFile(file);
  throw new Error("Choose a .md, .docx, or .pdf file.");
}
