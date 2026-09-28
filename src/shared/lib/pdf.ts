import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// pdf.js does its actual parsing on a worker thread; Vite's `?url` import
// gives it a real, hashed, cache-busted URL to that worker script instead
// of the CDN URL it defaults to (which would need network access this app
// otherwise never asks for).
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// The only structure pdf.js exposes per text run: its string, whether it
// ends a line in the source PDF, its vertical position (`transform`'s
// translateY), and its rendered size (a stand-in for font size — headings
// are reliably bigger than body text even when nothing else marks them as
// headings).
export type PdfTextRun = { str: string; hasEOL: boolean; height: number; transform: number[] };

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

// Every page's text runs, in order, plus the document's own title if its
// metadata has one.
export async function readPdf(data: ArrayBuffer): Promise<{ pages: PdfTextRun[][]; title: string | undefined }> {
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: PdfTextRun[][] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    pages.push(await readTextContent(await pdf.getPage(pageNumber)));
  }
  const metadata = await pdf.getMetadata().catch(() => undefined);
  const title = (metadata?.info as { Title?: string } | undefined)?.Title?.trim() || undefined;
  return { pages, title };
}
