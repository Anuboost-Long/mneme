import type { RecognizedDocument } from "@chain/sdk";

import { escapeAttr, escapeHtml } from "./import-sanitize";
import { recognizedBlocks, tableHtml } from "./recognized-document";
import type { Box, PdfTextRun } from "../../../shared/lib/pdf";

// `x` is where the line starts, so a list item's wrapped second line can
// be told apart from the next paragraph.
type PdfLine = { text: string; x: number; y: number; height: number; bold: boolean; italic: boolean };

const SYMBOL_FONT = /wingdings|webdings|dingbats|symbol/i;
const BOLD_FONT = /bold|black|heavy|semibold|demi/i;
const ITALIC_FONT = /italic|oblique/i;

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
    const height = Math.max(...ordered.map((run) => run.height)) || 10;
    const isMarker = (run: PdfTextRun) =>
      /^\d{1,3}$/.test(run.str.trim()) && run.height < height * 0.8 && run.transform[5] > ordered[0].transform[5] + 1;
    let text = "";
    let end = ordered[0].transform[4];
    for (const [index, run] of ordered.entries()) {
      const gap = run.transform[4] - end;
      const marker = isMarker(run);
      let str = run.str;
      if (marker) str = `[${run.str.trim()}]`;
      else if (index === 0 && run.str.trim().length === 1 && SYMBOL_FONT.test(run.font ?? "")) str = "•";
      text += (text && !marker && gap > run.height * 0.2 && !/\s$/.test(text) && !/^\s/.test(str) ? " " : "") + str;
      end = run.transform[4] + run.width;
    }
    if (!text.trim()) return;
    const first = ordered[0];
    const words = ordered.filter((run) => run.str.trim() && !isMarker(run) && !SYMBOL_FONT.test(run.font ?? ""));
    lines.push({
      text: text.trim(),
      x: first.transform[4],
      y: first.transform[5],
      height,
      bold: words.length > 0 && words.every((run) => BOLD_FONT.test(run.font ?? "")),
      italic: words.length > 0 && words.every((run) => ITALIC_FONT.test(run.font ?? ""))
    });
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

const PAGE_NUMBER = /^(?:page\s+)?(?:\d{1,4}|[ivxlcdm]{1,7})(?:\s*(?:of|\/)\s*\d{1,4})?$/i;

function edgeLines(lines: PdfLine[]): PdfLine[] {
  const fromTop = [...lines].sort((a, b) => b.y - a.y);
  return [...fromTop.slice(0, 2), ...fromTop.slice(-2)];
}

// Running headers/footers ("MIS501_Assessment_1_Brief Page 3 of 6") repeat
// on nearly every page with only a page number changing — normalizing
// digits away and looking only at each page's edge lines catches them
// without a hardcoded pattern for any one document's header text. A book
// alternates them (the book's title on left pages, the chapter's on
// right ones), so odd and even pages are also counted on their own. Real
// body content essentially never repeats verbatim across most of a
// document, so this is a safe bar.
function stripRunningHeadersFooters(pages: PdfLine[][]): PdfLine[][] {
  const counts = new Map<string, [number, number]>();
  pages.forEach((lines, index) => {
    for (const key of new Set(edgeLines(lines).map((line) => normalizeForDedup(line.text)))) {
      const count = counts.get(key) ?? [0, 0];
      count[index % 2]++;
      counts.set(key, count);
    }
  });
  const sides = [Math.ceil(pages.length / 2), Math.floor(pages.length / 2)];
  const repeated = new Set(
    [...counts]
      .filter(
        ([, count]) =>
          pages.length >= 3 &&
          (count[0] + count[1] >= pages.length / 2 || count.some((onSide, side) => sides[side] >= 3 && onSide > sides[side] / 2))
      )
      .map(([key]) => key)
  );
  return pages.map((lines) => {
    const kept = lines.filter((line) => !repeated.has(normalizeForDedup(line.text)));
    const edges = edgeLines(kept);
    return kept.filter((line) => !(edges.includes(line) && PAGE_NUMBER.test(line.text)));
  });
}

function splitFootnotes(lines: PdfLine[], bodyHeight: number): { body: PdfLine[]; notes: string[] } {
  const fromBottom = [...lines].sort((a, b) => a.y - b.y);
  const smallCount = fromBottom.findIndex((line) => line.height >= bodyHeight * 0.85);
  const bottom = fromBottom.slice(0, smallCount === -1 ? fromBottom.length : smallCount).reverse();
  const first = bottom.findIndex((line) => FOOTNOTE_PATTERN.test(line.text));
  if (first === -1) return { body: lines, notes: [] };
  const noteLines = bottom.slice(first);
  const notes: string[] = [];
  for (const line of noteLines) {
    const last = notes.length - 1;
    if (FOOTNOTE_PATTERN.test(line.text) || last === -1) notes.push(line.text);
    else if (/(?:https?:\/\/|www\.)\S*$/.test(notes[last]) && !/\s/.test(line.text)) notes[last] += line.text;
    else notes[last] = joinText(notes[last], line.text);
  }
  return { body: lines.filter((line) => !noteLines.includes(line)), notes };
}

const FOOTNOTE_PATTERN = /^\d{1,3}\.?\s+\S/;

function joinText(before: string, after: string): string {
  return /\p{L}-$/u.test(before) && /^\p{Ll}/u.test(after) ? before + after : `${before} ${after}`;
}

// `y` is where the block starts on its page, in PDF points from the bottom.
type Block =
  | { kind: "heading"; text: string; y: number; rank: number[] }
  | { kind: "paragraph"; text: string; y: number }
  | { kind: "bullet" | "numbered"; text: string; x: number; y: number; number?: number }
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

type HeadingBlock = Extract<Block, { kind: "heading" }>;

function headingRank(line: PdfLine, bodyHeight: number, standsAlone: boolean): number[] | null {
  if (line.text.length >= 120) return null;
  const larger = line.height > bodyHeight * 1.15;
  const boldLine = line.bold && standsAlone && line.height >= bodyHeight * 0.95 && !/[.,;:]$/.test(line.text);
  if (!larger && !boldLine) return null;
  const caps = line.text === line.text.toUpperCase() && /\p{Lu}/u.test(line.text);
  return [-Math.round(line.height), caps ? 0 : 1, line.bold ? 0 : 1, line.italic ? 1 : 0];
}

function continuesHeading(last: Block | undefined, line: PdfLine, bodyHeight: number): last is HeadingBlock {
  return last?.kind === "heading" && headingRank(line, bodyHeight, true)?.join() === last.rank.join();
}

function lineBlock(line: PdfLine, last: Block | undefined, bodyHeight: number, standsAlone: boolean): Block | null {
  const kind = listKind(line.text);
  if (kind) {
    const pattern = kind === "bullet" ? BULLET_PATTERN : NUMBERED_PATTERN;
    const number = kind === "numbered" ? Number.parseInt(line.text, 10) : Number.NaN;
    return { kind, text: line.text.replace(pattern, ""), x: line.x, y: line.y, number: Number.isNaN(number) ? undefined : number };
  }
  if (continuesItem(last, line) || continuesHeading(last, line, bodyHeight)) {
    last.text = last.text ? joinText(last.text, line.text) : line.text;
    return null;
  }
  const rank = headingRank(line, bodyHeight, standsAlone);
  if (rank) return { kind: "heading", text: line.text, y: line.y, rank };
  if (last?.kind === "paragraph") {
    last.text = joinText(last.text, line.text);
    return null;
  }
  return { kind: "paragraph", text: line.text, y: line.y };
}

function groupLinesIntoBlocks(lines: PdfLine[], bodyHeight: number): Block[] {
  const blocks: Block[] = [];
  let previousY: number | null = null;
  for (const line of lines) {
    const broke = previousY !== null && previousY - line.y > line.height * 1.8;
    const block = lineBlock(line, broke ? undefined : blocks[blocks.length - 1], bodyHeight, previousY === null || broke);
    if (block) blocks.push(block);
    previousY = line.y;
  }
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
function pageBlocks(lines: PdfLine[], bodyHeight: number, { runs, images, height, recognized }: PdfPageContent): Block[] {
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
  return placeBlocks(
    groupLinesIntoBlocks(lines.filter((line) => !insideTable(line) && !insideFigure(line)), bodyHeight),
    inserted
  );
}

function renderBlocks(blocks: Block[], levels: Map<string, number>): string {
  const html: string[] = [];
  let items: string[] = [];
  let listTag: "ul" | "ol" = "ul";
  let start = 1;

  function flushList() {
    if (items.length === 0) return;
    const listItems = items.map((text) => `<li>${escapeHtml(text)}</li>`).join("");
    const startAttribute = listTag === "ol" && start !== 1 ? ` start="${start}"` : "";
    html.push(`<${listTag}${startAttribute}>${listItems}</${listTag}>`);
    items = [];
  }

  for (const block of blocks) {
    if (block.kind === "bullet" || block.kind === "numbered") {
      const tag = block.kind === "bullet" ? "ul" : "ol";
      if (tag !== listTag) flushList();
      if (items.length === 0) start = block.number ?? 1;
      listTag = tag;
      items.push(block.text);
      continue;
    }
    flushList();
    if (block.kind === "image") html.push(`<img src="${escapeAttr(block.src)}" alt="">`);
    else if (block.kind === "html") html.push(block.html);
    else if (block.kind === "heading") {
      const level = levels.get(block.rank.join()) ?? 2;
      html.push(`<h${level}>${escapeHtml(block.text)}</h${level}>`);
    }
    else html.push(`<p>${escapeHtml(block.text)}</p>`);
  }
  flushList();
  return html.join("");
}

function bodyHeightOf(lines: PdfLine[]): number {
  const characters = new Map<number, number>();
  for (const { height, text } of lines) characters.set(height, (characters.get(height) ?? 0) + text.length);
  return [...characters].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 10;
}

function readingRuns(runs: PdfTextRun[]): PdfTextRun[] {
  const upright = runs.filter((run) => run.transform[1] === 0 && run.transform[2] === 0);
  return upright.some((run) => run.str.trim()) ? upright : runs;
}

const ENDS_BLOCK = /[.!?:;)\]"”’]$/;

function appendPage(blocks: Block[], page: Block[]) {
  const last = blocks[blocks.length - 1];
  const [first, ...rest] = page;
  const cutOff =
    (last?.kind === "paragraph" || last?.kind === "bullet" || last?.kind === "numbered") &&
    !ENDS_BLOCK.test(last.text) &&
    first?.kind === "paragraph" &&
    (/^\p{Ll}/u.test(first.text) || /[,\-–—]$/.test(last.text));
  if (!cutOff) {
    blocks.push(...page);
    return;
  }
  last.text = joinText(last.text, first.text);
  blocks.push(...rest);
}

function compareRanks(a: number[], b: number[]): number {
  const index = a.findIndex((value, position) => value !== b[position]);
  return index === -1 ? 0 : a[index] - b[index];
}

function headingLevels(headings: HeadingBlock[]): Map<string, number> {
  const ranks = [...new Map(headings.map(({ rank }) => [rank.join(), rank])).values()].sort(compareRanks);
  return new Map(ranks.map((rank, index) => [rank.join(), Math.min(index + 2, 6)]));
}

function titleHeading(blocks: Block[], firstPageEnd: number, bodyHeight: number): HeadingBlock | undefined {
  const headings = blocks.filter((block): block is HeadingBlock => block.kind === "heading");
  const [top] = [...headings].sort((a, b) => compareRanks(a.rank, b.rank));
  if (!top || -top.rank[0] <= bodyHeight * 1.15 || blocks.indexOf(top) >= firstPageEnd) return undefined;
  return headings.filter(({ rank }) => rank.join() === top.rank.join()).length === 1 ? top : undefined;
}

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"]+/g;

function trimUrl(url: string): string {
  const unopened = (url.match(/\)/g) ?? []).length > (url.match(/\(/g) ?? []).length;
  if (/[.,;:]$/.test(url) || (url.endsWith(")") && unopened)) return trimUrl(url.slice(0, -1));
  return url;
}

function linkedHtml(text: string): string {
  let html = "";
  let index = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimUrl(match[0]);
    const href = url.startsWith("www.") ? `https://${url}` : url;
    html += `${escapeHtml(text.slice(index, match.index))}<a href="${escapeAttr(href)}">${escapeHtml(url)}</a>`;
    index = match.index + url.length;
  }
  return html + escapeHtml(text.slice(index));
}

function notesHtml(notes: string[]): string {
  if (notes.length === 0) return "";
  const paragraphs = notes.map((note) => `<p>${linkedHtml(note)}</p>`).join("");
  return `<h2>Notes</h2>${paragraphs}`;
}

// Turns pdf.js's flat per-page text runs into headings, paragraphs and
// lists, read as one document: page furniture and footnotes come out of
// the text, and a paragraph cut by a page break is joined back up. The
// title is the document's own title heading, when it has one.
export function pdfPagesToHtml(pages: PdfPageContent[]): { html: string; title?: string } {
  const pageLines = stripRunningHeadersFooters(pages.map(({ runs }) => buildLines(readingRuns(runs))));
  const bodyHeight = bodyHeightOf(pageLines.flat());
  const blocks: Block[] = [];
  const notes: string[] = [];
  let firstPageEnd = 0;
  pageLines.forEach((lines, index) => {
    const page = splitFootnotes(lines, bodyHeight);
    notes.push(...page.notes);
    appendPage(blocks, pageBlocks(page.body, bodyHeight, pages[index]));
    if (index === 0) firstPageEnd = blocks.length;
  });
  const title = titleHeading(blocks, firstPageEnd, bodyHeight);
  const body = blocks.filter((block) => block !== title);
  const levels = headingLevels(body.filter((block): block is HeadingBlock => block.kind === "heading"));
  return { html: renderBlocks(body, levels) + notesHtml(notes), title: title?.text };
}
