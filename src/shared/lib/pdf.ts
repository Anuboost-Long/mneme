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
// headings). `font` is the embedded font's name ("DINNextLTPro-Bold"), known
// once the page's operator list has been read.
export type PdfTextRun = { str: string; hasEOL: boolean; height: number; width: number; transform: number[]; fontName?: string; font?: string };

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

function fontName(page: pdfjsLib.PDFPageProxy, id: string | undefined) {
  if (!id || !page.commonObjs.has(id)) return "";
  return (page.commonObjs.get(id) as { name?: string }).name ?? "";
}

async function readTextContent(page: pdfjsLib.PDFPageProxy): Promise<PdfTextRun[]> {
  const reader = (page.streamTextContent({}) as ReadableStream<PdfTextContentChunk>).getReader();
  const [left, bottom, right, top] = page.view;
  const items: PdfTextRun[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    for (const item of value.items) {
      if (!isTextRun(item)) continue;
      const [, , , , x, y] = item.transform;
      if (x >= left - 1 && x <= right && y >= bottom - 1 && y <= top) items.push({ ...item, font: fontName(page, item.fontName) });
    }
  }
  return items;
}

// An image or drawn figure on a page, cropped from a render of it. `top`
// is its top edge in PDF points from the page's bottom, like a text run's
// y. A figure also says what area it `covers`, since its text labels are
// part of the picture and shouldn't be imported again as text.
export type PdfImage = { top: number; png: Blob; covers?: Box };

// `height` is in points; `recognized` is what readPdf's `recognize` made
// of the rendered page.
export type PdfPage<T> = { runs: PdfTextRun[]; images: PdfImage[]; height: number; recognized?: T };

export type Box = { left: number; bottom: number; right: number; top: number };

// Smaller than this (in points) is a bullet, icon or rule, not a picture.
const MIN_IMAGE_POINTS = 24;
const RENDER_SCALE = 2;
// Diagrams leave room between boxes and their connectors.
const FIGURE_GAP_POINTS = 24;
const MIN_FIGURE_SHAPES = 4;

// pdf.js paints an image into the unit square under the current transform,
// so its box is that square mapped through the transform in effect.
function unitSquareBox([a, b, c, d, e, f]: number[]): Box {
  const xs = [e, a + e, c + e, a + c + e];
  const ys = [f, b + f, d + f, b + d + f];
  return { left: Math.min(...xs), bottom: Math.min(...ys), right: Math.max(...xs), top: Math.max(...ys) };
}

// A drawn shape's box (pdf.js gives it in the shape's own coordinates)
// mapped onto the page through the transform in effect.
function mappedBox([a, b, c, d, e, f]: number[], [x0, y0, x1, y1]: number[]): Box {
  const xs = [a * x0 + c * y0 + e, a * x1 + c * y0 + e, a * x0 + c * y1 + e, a * x1 + c * y1 + e];
  const ys = [b * x0 + d * y0 + f, b * x1 + d * y0 + f, b * x0 + d * y1 + f, b * x1 + d * y1 + f];
  return { left: Math.min(...xs), bottom: Math.min(...ys), right: Math.max(...xs), top: Math.max(...ys) };
}

const near = (a: Box, b: Box, gap: number) =>
  a.left - gap <= b.right && b.left - gap <= a.right && a.bottom - gap <= b.top && b.bottom - gap <= a.top;

const union = (a: Box, b: Box): Box => ({
  left: Math.min(a.left, b.left),
  bottom: Math.min(a.bottom, b.bottom),
  right: Math.max(a.right, b.right),
  top: Math.max(a.top, b.top)
});

// Shapes a few points apart belong to one drawing; one with enough shapes
// and size is a figure (a diagram, a chart), not a rule or an underline.
function figureBoxes(shapes: Box[]): Box[] {
  const clusters = shapes.map((box) => ({ box, count: 1 }));
  for (let merged = true; merged; ) {
    merged = false;
    for (let i = 0; i < clusters.length && !merged; i++)
      for (let j = i + 1; j < clusters.length && !merged; j++)
        if (near(clusters[i].box, clusters[j].box, FIGURE_GAP_POINTS)) {
          clusters[i] = { box: union(clusters[i].box, clusters[j].box), count: clusters[i].count + clusters[j].count };
          clusters.splice(j, 1);
          merged = true;
        }
  }
  return clusters
    .filter(({ box, count }) => count >= MIN_FIGURE_SHAPES && box.right - box.left >= 60 && box.top - box.bottom >= 40)
    .map(({ box }) => box);
}

// Embedded pictures and drawn figures on a page. Clipping paths and
// page-sized backgrounds aren't drawings.
function pageDrawings({ fnArray, argsArray }: { fnArray: number[]; argsArray: unknown[] }, pageArea: number) {
  const { OPS, Util } = pdfjsLib;
  let matrix = [1, 0, 0, 1, 0, 0];
  const saved: number[][] = [];
  const images: Box[] = [];
  const shapes: Box[] = [];
  fnArray.forEach((operation, index) => {
    const args = argsArray[index] as unknown[];
    if (operation === OPS.save) saved.push(matrix);
    else if (operation === OPS.restore || operation === OPS.paintFormXObjectEnd)
      matrix = saved.pop() ?? matrix;
    else if (operation === OPS.transform) matrix = Util.transform(matrix, args as number[]);
    else if (operation === OPS.paintFormXObjectBegin) {
      saved.push(matrix);
      if (Array.isArray(args[0])) matrix = Util.transform(matrix, args[0] as number[]);
    } else if (operation === OPS.paintImageXObject || operation === OPS.paintInlineImageXObject)
      images.push(unitSquareBox(matrix));
    else if (operation === OPS.constructPath && args[0] !== OPS.endPath && args[2]) {
      const box = mappedBox(matrix, Array.from(args[2] as ArrayLike<number>));
      if ((box.right - box.left) * (box.top - box.bottom) < pageArea / 2) shapes.push(box);
    }
  });
  const figures = figureBoxes(shapes);
  const inFigure = (box: Box) => figures.some((figure) => near(figure, box, 0));
  return {
    images: images.filter(
      (box) => box.right - box.left >= MIN_IMAGE_POINTS && box.top - box.bottom >= MIN_IMAGE_POINTS && !inFigure(box)
    ),
    figures
  };
}

function boxKey(box: Box) {
  return [box.left, box.bottom, box.right, box.top].map(Math.round).join(",");
}

// A logo in the same place on most pages is page furniture, like a
// running header.
function repeatedBoxes(pages: Box[][]) {
  if (pages.length < 3) return new Set<string>();
  const counts = new Map<string, number>();
  for (const boxes of pages)
    for (const key of new Set(boxes.map(boxKey))) counts.set(key, (counts.get(key) ?? 0) + 1);
  return new Set([...counts].filter(([, count]) => count >= pages.length / 2).map(([key]) => key));
}

function toPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn’t read a page of this PDF."))), "image/png")
  );
}

async function renderPage(page: pdfjsLib.PDFPageProxy) {
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvas, viewport }).promise;
  return { canvas, viewport };
}

// A little room around a figure, so its outer strokes aren't cut off.
const padded = (box: Box): Box => ({ left: box.left - 4, bottom: box.bottom - 4, right: box.right + 4, top: box.top + 4 });

async function cropImage(
  { canvas, viewport }: Awaited<ReturnType<typeof renderPage>>,
  box: Box
): Promise<PdfImage> {
  const [x1, y1] = viewport.convertToViewportPoint(box.left, box.top);
  const [x2, y2] = viewport.convertToViewportPoint(box.right, box.bottom);
  const crop = document.createElement("canvas");
  crop.width = Math.max(1, Math.round(Math.abs(x2 - x1)));
  crop.height = Math.max(1, Math.round(Math.abs(y2 - y1)));
  crop.getContext("2d")?.drawImage(canvas, Math.min(x1, x2), Math.min(y1, y2), crop.width, crop.height, 0, 0, crop.width, crop.height);
  return { top: box.top, png: await toPng(crop) };
}

// Every page's text runs, in order, plus the document's own title if its
// metadata has one. Images and `recognize` are opt-in, since both render
// the page. `recognize` gets each rendered page as PNG bytes; returning
// null means it can't recognize anything, so no page is rendered for it
// again.
export async function readPdf<T>(
  data: ArrayBuffer,
  { images = false, recognize }: { images?: boolean; recognize?: (png: Uint8Array) => Promise<T | null> } = {}
): Promise<{ pages: PdfPage<T>[]; title: string | undefined }> {
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const read = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const { width, height } = page.getViewport({ scale: 1 });
    const drawings = images ? pageDrawings(await page.getOperatorList(), width * height) : { images: [], figures: [] };
    read.push({ page, runs: await readTextContent(page), boxes: drawings.images, figures: drawings.figures });
  }
  const repeated = repeatedBoxes(read.map((item) => item.boxes));
  let recognizing = recognize !== undefined;
  const pages: PdfPage<T>[] = [];
  for (const { page, runs, boxes, figures } of read) {
    const pictures = boxes.filter((box) => !repeated.has(boxKey(box)));
    const height = page.getViewport({ scale: 1 }).height;
    if (pictures.length === 0 && figures.length === 0 && !recognizing) {
      pages.push({ runs, images: [], height });
      continue;
    }
    const rendered = await renderPage(page);
    const cropped = await Promise.all([
      ...pictures.map((box) => cropImage(rendered, box)),
      ...figures.map(async (box) => ({ ...(await cropImage(rendered, padded(box))), covers: box }))
    ]);
    const recognized =
      recognizing && recognize
        ? await recognize(new Uint8Array(await (await toPng(rendered.canvas)).arrayBuffer()))
        : null;
    if (recognized === null) recognizing = false;
    pages.push({ runs, images: cropped, height, recognized: recognized ?? undefined });
  }
  const metadata = await pdf.getMetadata().catch(() => undefined);
  const title = (metadata?.info as { Title?: string } | undefined)?.Title?.trim() || undefined;
  return { pages, title };
}
