import { formatSize } from "@/shared/lib/formatSize";
import { readPdf } from "@/shared/lib/pdf";

// What's saved with the message: enough to draw the file's card and
// preview in the transcript. `preview` holds the first PREVIEW_CHARS of
// the text; the agent itself received all of it. An image has no text:
// `reference` is its desktop.files copy, written when the message is sent.
export type AttachmentInfo = {
  name: string;
  size: number;
  kind: "text" | "pdf" | "image";
  count: number;
  preview: string;
  truncated: boolean;
  reference?: string;
};
// `bytes` is only kept for images, until they're written to desktop.files.
export type ChatAttachment = AttachmentInfo & { text: string; bytes?: Uint8Array<ArrayBuffer> };

// Text and PDFs are read in the webview and sent to the agent as text, so
// a PDF goes as its extracted text. Images go as themselves — see
// runTurn.ts's withImages.
const MAX_TEXT_BYTES = 1_000_000;
const MAX_PDF_BYTES = 20_000_000;
// Claude's own per-image limit.
const MAX_IMAGE_BYTES = 5_000_000;
const PREVIEW_CHARS = 4000;

// The formats both Claude and Codex accept.
const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp"
};

export function imageMediaType(name: string): string | undefined {
  return IMAGE_TYPES[fileExtension(name)];
}

function isPdf(file: File) {
  return file.type === "application/pdf" || fileExtension(file.name) === "pdf";
}

function describe(
  name: string,
  size: number,
  kind: AttachmentInfo["kind"],
  count: number,
  previewSource: string,
  text: string
): ChatAttachment {
  return {
    name,
    size,
    kind,
    count,
    preview: previewSource.slice(0, PREVIEW_CHARS),
    truncated: previewSource.length > PREVIEW_CHARS,
    text
  };
}

async function readPdfAttachment(file: File): Promise<ChatAttachment> {
  if (file.size > MAX_PDF_BYTES)
    throw new Error(`${file.name} is larger than 20 MB. Attach a smaller PDF.`);
  const { pages } = await readPdf(await file.arrayBuffer()).catch(() => {
    throw new Error(`Couldn’t read ${file.name}. Check that it opens as a PDF, then try again.`);
  });
  const pageTexts = pages.map(({ runs }) =>
    runs
      .map((run) => run.str + (run.hasEOL ? "\n" : ""))
      .join("")
      .trim()
  );
  if (!pageTexts.some(Boolean))
    throw new Error(
      `${file.name} has no selectable text, so it’s probably a scanned image. Attach a PDF with real text.`
    );
  const text = pageTexts.map((page, index) => `[Page ${index + 1}]\n${page}`).join("\n\n");
  return describe(
    file.name,
    file.size,
    "pdf",
    pages.length,
    pageTexts.filter(Boolean).join("\n\n"),
    text
  );
}

async function readImageAttachment(file: File): Promise<ChatAttachment> {
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error(`${file.name} is larger than 5 MB. Attach a smaller image.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { ...describe(file.name, file.size, "image", 0, "", ""), bytes };
}

export async function readAttachment(file: File): Promise<ChatAttachment> {
  if (isPdf(file)) return readPdfAttachment(file);
  if (imageMediaType(file.name)) return readImageAttachment(file);
  if (file.size > MAX_TEXT_BYTES)
    throw new Error(`${file.name} is larger than 1 MB. Attach a smaller file.`);
  const text = await file.text();
  // A NUL character never appears in real text, so it marks a binary file.
  if (text.includes("\0"))
    throw new Error(
      `${file.name} can’t be attached. Attach an image (PNG, JPEG, GIF or WebP), a PDF, or a text file, like code, Markdown, CSV or JSON.`
    );
  return describe(file.name, file.size, "text", text.split("\n").length, text, text);
}

// Text and PDFs only; images travel separately.
export function formatAttachments(attachments: ChatAttachment[]): string {
  return attachments
    .filter((file) => file.kind !== "image")
    .map((file) => `<file name=${JSON.stringify(file.name)}>\n${file.text}\n</file>`)
    .join("\n\n");
}

// Messages saved before PDFs and previews existed only have name and size.
export function parseAttachments(json: string | null): AttachmentInfo[] {
  if (!json) return [];
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return [];
    return value
      .filter((item) => typeof item?.name === "string" && typeof item?.size === "number")
      .map((item) => ({ kind: "text", count: 0, preview: "", truncated: false, ...item }));
  } catch {
    return [];
  }
}

export function fileExtension(name: string): string {
  const match = /\.([^./]+)$/.exec(name);
  return match ? match[1].toLowerCase() : "";
}

export function describeAttachment({ kind, count, size }: AttachmentInfo): string {
  if (!count) return formatSize(size);
  const unit = kind === "pdf" ? "page" : "line";
  return `${count.toLocaleString()} ${unit}${count === 1 ? "" : "s"} · ${formatSize(size)}`;
}
