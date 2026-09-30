import type { RecognizedDocument } from "@chain/sdk";

import { escapeAttr, escapeHtml } from "./import-sanitize";
import { recognizedBlocks, tableHtml } from "./recognized-document";
import type { Box, PdfTextRun } from "../../../shared/lib/pdf";

// `x` is where the line starts, so a list item's wrapped second line can
// be told apart from the next paragraph.
type PdfLine = { text: string; x: number; y: number; height: number };

// A line ends where the PDF says so or where the baseline moves, and its
// pieces are read left to right: some PDFs write a bullet glyph after its
// text, or a new line's first word before the previous line has ended.
function buildLines(items: PdfTextRun[]): PdfLine[] {
  const lines: PdfLine[] = [];
  let runs: PdfTextRun[] = [];

  function flush() {
    const ordered = runs.filter((run) => run.str).sort((a, b) => a.transform[4] - b.transform[4]);
    runs = [];
    if (ordered.length === 0) return;
    let text = "";
    let end = ordered[0].transform[4];
    for (const run of ordered) {
      const gap = run.transform[4] - end;
      text += (text && gap > run.height * 0.2 && !/\s$/.test(text) && !/^\s/.test(run.str) ? " " : "") + run.str;
      end = run.transform[4] + run.width;
    }
    if (!text.trim()) return;
    const first = ordered[0];
    lines.push({ text: text.trim(), x: first.transform[4], y: first.transform[5], height: Math.max(...ordered.map((run) => run.height)) || 10 });
  }

  for (const item of items) {
    const current = runs.find((run) => run.str.trim());
    if (current && item.str.trim() && Math.abs(item.transform[5] - current.transform[5]) > Math.max(current.height, item.height) / 2) flush();
    runs.push(item);
    if (item.hasEOL) flush();
  }
  flush();
  return attachLoneBullets(lines);
}

// A bullet glyph written far from its text ends up as a line of its own;
// it belongs in front of the text at the same height.
function attachLoneBullets(lines: PdfLine[]): PdfLine[] {
  const lone = lines.filter((line) => BULLET_PATTERN.test(line.text) && !line.text.replace(BULLET_PATTERN, "").trim());
  for (const glyph of lone) {
    const owner = lines.find(
      (line) =>
        !lone.includes(line) &&
        line.x > glyph.x &&
        !BULLET_PATTERN.test(line.text) &&
        Math.abs(line.y - glyph.y) < Math.max(line.height, glyph.height) / 2
    );
    if (!owner) continue;
    owner.text = `${glyph.text} ${owner.text}`;
    owner.x = glyph.x;
    lines.splice(lines.indexOf(glyph), 1);
  }
  return lines;
}

function normalizeForDedup(text: string): string {
  return text.toLowerCase().replace(/\d+/g, "#").trim();
}

// Running headers/footers ("MIS501_Assessment_1_Brief Page 3 of 6") repeat
// on nearly every page with only a page number changing — normalizing
// digits away and looking only at each page's first/last couple of lines
// catches them without a hardcoded pattern for any one document's header
// text. Real body content essentially never repeats verbatim across most
// of a document, so this is a safe bar.
function stripRunningHeadersFooters(pages: PdfLine[][]): PdfLine[][] {
  if (pages.length < 3) return pages;
  const counts = new Map<string, number>();
  for (const lines of pages) {
    const edgeKeys = new Set([...lines.slice(0, 2), ...lines.slice(-2)].map((line) => normalizeForDedup(line.text)));
    for (const key of edgeKeys) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const threshold = Math.ceil(pages.length / 2);
  const repeated = new Set([...counts].filter(([, count]) => count >= threshold).map(([key]) => key));
  if (repeated.size === 0) return pages;
  return pages.map((lines) => lines.filter((line) => !repeated.has(normalizeForDedup(line.text))));
}

// `y` is where the block starts on its page, in PDF points from the bottom.
type Block =
  | { kind: "heading" | "paragraph"; text: string; y: number }
  | { kind: "bullet" | "numbered"; text: string; x: number; y: number }
  | { kind: "image"; src: string; y: number }
  | { kind: "html"; html: string; y: number };

// A stored image and the top edge of where it sat on its page. A drawn
// figure also has the area it `covers`, whose text is part of the picture.
export type PlacedImage = { top: number; src: string; covers?: Box };

// `height` is the page's height in points; `recognized` is what document
// recognition read from a render of the page, when the OS can.
export type PdfPageContent = {
  runs: PdfTextRun[];
  images: PlacedImage[];
  height: number;
  recognized?: RecognizedDocument;
};

// Bullet glyphs PDFs use, including the private-use symbols Word and
// Wingdings export, and the control characters a symbol font's glyph can
// come through as (a book's ■ read as U+0002); a dash or asterisk only
// counts with a space after it.
const BULLET_PATTERN = /^(?:[•◦▪▫■□●○◆◇▶►‣⁃∙·\u0001-\u0008\u000E-\u001F\uF076\uF0A7\uF0A8\uF0B7\uF0D8\uF0FC]\s*|[-–—*]\s+)/u;
const NUMBERED_PATTERN = /^(?:\d{1,3}|[a-z])[.)]\s+/;

// A line continues the list item above it when it starts to the right of
// that item's marker (the wrapped text lines up with the item's text), or
// when the marker stood on a line of its own.
type ListItem = Extract<Block, { x: number }>;

function continuesItem(item: Block | undefined, line: PdfLine): item is ListItem {
  if (item?.kind !== "bullet" && item?.kind !== "numbered") return false;
  return !item.text || line.x > item.x + 2;
}

function listKind(text: string): ListItem["kind"] | null {
  if (BULLET_PATTERN.test(text)) return "bullet";
  if (NUMBERED_PATTERN.test(text)) return "numbered";
  return null;
}

function groupLinesIntoBlocks(lines: PdfLine[]): Block[] {
  if (lines.length === 0) return [];
  const sortedHeights = lines.map((line) => line.height).sort((a, b) => a - b);
  const bodyHeight = sortedHeights[Math.floor(sortedHeights.length / 2)];

  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let paragraphY = 0;
  let previousY: number | null = null;

  function flushParagraph() {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "paragraph", text: paragraph.join(" "), y: paragraphY });
    paragraph = [];
  }

  for (const line of lines) {
    const gap = previousY === null ? 0 : previousY - line.y;
    const broke = previousY !== null && gap > line.height * 1.8;
    if (broke) flushParagraph();
    previousY = line.y;

    const kind = listKind(line.text);
    const isHeading = !kind && line.height > bodyHeight * 1.15 && line.text.length < 120;
    const last = blocks[blocks.length - 1];

    if (kind) {
      flushParagraph();
      const pattern = kind === "bullet" ? BULLET_PATTERN : NUMBERED_PATTERN;
      blocks.push({ kind, text: line.text.replace(pattern, ""), x: line.x, y: line.y });
    } else if (!broke && paragraph.length === 0 && continuesItem(last, line)) {
      last.text = last.text ? `${last.text} ${line.text}` : line.text;
    } else if (isHeading) {
      flushParagraph();
      blocks.push({ kind: "heading", text: line.text, y: line.y });
    } else {
      if (paragraph.length === 0) paragraphY = line.y;
      paragraph.push(line.text);
    }
  }
  flushParagraph();
  return blocks;
}

// Each inserted block (an image, a table) goes before the first text block
// that starts below its top edge.
function placeBlocks(text: Block[], inserted: Block[]): Block[] {
  const placed = [...text];
  for (const block of [...inserted].sort((a, b) => b.y - a.y)) {
    const below = placed.findIndex((item) => text.includes(item) && item.y < block.y);
    placed.splice(below === -1 ? placed.length : below, 0, block);
  }
  return placed;
}

// Recognized tables replace the text-layer lines inside them. A page with
// no text layer (a scan) takes everything recognized instead of its image.
function pageBlocks(lines: PdfLine[], { runs, images, height, recognized }: PdfPageContent): Block[] {
  const pdfY = (top: number) => height * (1 - top);
  const tables = recognized?.tables ?? [];
  const insideTable = (line: PdfLine) =>
    tables.some(({ box }) => line.y <= pdfY(box.y) && line.y >= pdfY(box.y + box.height));
  // A ruled table is drawn with lines too; where it was read as a table,
  // the table wins over a picture of it.
  const figures = images.filter(
    ({ covers }) =>
      !covers || !tables.some(({ box }) => pdfY(box.y + box.height) < covers.top && pdfY(box.y) > covers.bottom)
  );
  const insideFigure = (line: PdfLine) =>
    figures.some(({ covers }) => covers && line.y >= covers.bottom - 2 && line.y <= covers.top + 2 && line.x >= covers.left - 2 && line.x <= covers.right);
  const everything = recognized ? recognizedBlocks(recognized) : [];
  const scanned = runs.length === 0 && everything.length > 0;
  const recognizedHtml = scanned
    ? everything
    : tables.map((table) => ({ top: table.box.y, html: tableHtml(table) }));
  const inserted: Block[] = [
    ...(scanned ? [] : figures.map((image): Block => ({ kind: "image", src: image.src, y: image.top }))),
    ...recognizedHtml.map(({ top, html }): Block => ({ kind: "html", html, y: pdfY(top) }))
  ];
  return placeBlocks(groupLinesIntoBlocks(lines.filter((line) => !insideTable(line) && !insideFigure(line))), inserted);
}

function renderBlocks(blocks: Block[]): string {
  const html: string[] = [];
  let items: string[] = [];
  let listTag: "ul" | "ol" = "ul";

  function flushList() {
    if (items.length === 0) return;
    html.push(`<${listTag}>${items.map((text) => `<li>${escapeHtml(text)}</li>`).join("")}</${listTag}>`);
    items = [];
  }

  for (const block of blocks) {
    if (block.kind === "bullet" || block.kind === "numbered") {
      const tag = block.kind === "bullet" ? "ul" : "ol";
      if (tag !== listTag) flushList();
      listTag = tag;
      items.push(block.text);
      continue;
    }
    flushList();
    if (block.kind === "image") html.push(`<img src="${escapeAttr(block.src)}" alt="">`);
    else if (block.kind === "html") html.push(block.html);
    else if (block.kind === "heading") html.push(`<h3>${escapeHtml(block.text)}</h3>`);
    else html.push(`<p>${escapeHtml(block.text)}</p>`);
  }
  flushList();
  return html.join("");
}

// Turns pdf.js's flat per-page text runs into headings/paragraphs/bullet
// lists instead of one run-on blob per page — see the three helpers above
// for what each step of that reconstruction actually detects.
export function pdfPagesToHtml(pages: PdfPageContent[]): string {
  const lines = stripRunningHeadersFooters(pages.map(({ runs }) => buildLines(runs)));
  return lines
    .map((pageLines, index) => renderBlocks(pageBlocks(pageLines, pages[index])))
    .join("");
}
