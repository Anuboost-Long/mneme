import mammoth from "mammoth";
import { marked } from "marked";
import { detectType, sanitizeChildren, type ParsedImport } from "./import-sanitize";
import { pdfPagesToHtml } from "./pdf-structure";
import { readPdf } from "../../../shared/lib/pdf";

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

async function parsePdfFile(file: File): Promise<ParsedImport> {
  const { pages, title: metaTitle } = await readPdf(await file.arrayBuffer());
  const html = pdfPagesToHtml(pages);
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
