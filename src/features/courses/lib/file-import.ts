import mammoth from "mammoth";
import { marked } from "marked";
import { detectType, sanitizeChildren, type ParsedImport } from "./import-sanitize";
import { pageImage } from "./page-image";
import { pdfPagesToHtml } from "./pdf-structure";
import { recognizeDocument } from "../../../shared/lib/ocr";
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
function sanitizeHtmlFragment(html: string, storedImages?: ReadonlySet<string>): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
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
        const imageFile = new File([await image.readAsArrayBuffer()], "docx-image", { type: image.contentType });
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
  const html = pdfPagesToHtml(
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
