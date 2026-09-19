import { escapeHtml } from "./import-sanitize";

// The only structure pdf.js exposes per text run: its string, whether it
// ends a line in the source PDF, its vertical position (`transform`'s
// translateY), and its rendered size (a stand-in for font size — headings
// are reliably bigger than body text even when nothing else marks them as
// headings).
export type PdfTextRun = { str: string; hasEOL: boolean; height: number; transform: number[] };

type PdfLine = { text: string; y: number; height: number };

function buildLines(items: PdfTextRun[]): PdfLine[] {
  const lines: PdfLine[] = [];
  let text = "";
  let y = 0;
  let height = 0;
  for (const item of items) {
    if (!text) { y = item.transform[5]; height = item.height; }
    text += item.str;
    if (item.hasEOL) {
      if (text.trim()) lines.push({ text: text.trim(), y, height: height || 10 });
      text = "";
      height = 0;
    }
  }
  if (text.trim()) lines.push({ text: text.trim(), y, height: height || 10 });
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

type Block = { kind: "heading" | "paragraph" | "bullet"; text: string };

const BULLET_PATTERN = /^[•◦▪]\s+/;

function groupLinesIntoBlocks(lines: PdfLine[]): Block[] {
  if (lines.length === 0) return [];
  const sortedHeights = lines.map((line) => line.height).sort((a, b) => a - b);
  const bodyHeight = sortedHeights[Math.floor(sortedHeights.length / 2)];

  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let previousY: number | null = null;

  function flushParagraph() {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  }

  for (const line of lines) {
    const gap = previousY === null ? 0 : previousY - line.y;
    if (previousY !== null && gap > line.height * 1.8) flushParagraph();
    previousY = line.y;

    const isBullet = BULLET_PATTERN.test(line.text);
    const isHeading = !isBullet && line.height > bodyHeight * 1.15 && line.text.length < 120;

    if (isBullet) {
      flushParagraph();
      blocks.push({ kind: "bullet", text: line.text.replace(BULLET_PATTERN, "") });
    } else if (isHeading) {
      flushParagraph();
      blocks.push({ kind: "heading", text: line.text });
    } else {
      paragraph.push(line.text);
    }
  }
  flushParagraph();
  return blocks;
}

function renderBlocks(blocks: Block[]): string {
  const html: string[] = [];
  let bullets: string[] = [];

  function flushBullets() {
    if (bullets.length === 0) return;
    html.push(`<ul>${bullets.map((text) => `<li>${escapeHtml(text)}</li>`).join("")}</ul>`);
    bullets = [];
  }

  for (const block of blocks) {
    if (block.kind === "bullet") { bullets.push(block.text); continue; }
    flushBullets();
    if (block.kind === "heading") html.push(`<h3>${escapeHtml(block.text)}</h3>`);
    else html.push(`<p>${escapeHtml(block.text)}</p>`);
  }
  flushBullets();
  return html.join("");
}

// Turns pdf.js's flat per-page text runs into headings/paragraphs/bullet
// lists instead of one run-on blob per page — see the three helpers above
// for what each step of that reconstruction actually detects.
export function pdfPagesToHtml(pagesOfItems: PdfTextRun[][]): string {
  const pages = stripRunningHeadersFooters(pagesOfItems.map(buildLines));
  return pages.map((lines) => renderBlocks(groupLinesIntoBlocks(lines))).join("");
}
