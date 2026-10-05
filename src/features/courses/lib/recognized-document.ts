import type { RecognizedDocument } from "@chain/sdk";

import { escapeHtml } from "./import-sanitize";

type Table = RecognizedDocument["tables"][number];
type Cell = Table["rows"][number][number];

// A block of recognized content and its top edge, 0–1 from the top of the image.
export type RecognizedBlock = { top: number; html: string };

function spans({ rowSpan, colSpan }: Cell) {
  return (rowSpan ? ` rowspan="${rowSpan}"` : "") + (colSpan ? ` colspan="${colSpan}"` : "");
}

function cellHtml(tag: "th" | "td", cell: Cell) {
  const lines = cell.text.split("\n").map(escapeHtml).join("<br>");
  return `<${tag}${spans(cell)}>${lines}</${tag}>`;
}

function listHtml(items: string[]) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

// The first row becomes the header: recognizers don't mark one, and
// course tables almost always have one.
export function tableHtml(table: Table) {
  const rows = table.rows.map((cells, index) => {
    const tag = index === 0 ? "th" : "td";
    return `<tr>${cells.map((cell) => cellHtml(tag, cell)).join("")}</tr>`;
  });
  return `<table><tbody>${rows.join("")}</tbody></table>`;
}

// Everything recognized, top to bottom: a scanned page or a photo of one.
export function recognizedBlocks(document: RecognizedDocument): RecognizedBlock[] {
  return [
    ...document.paragraphs.map(({ text, box }) => ({ top: box.y, html: `<p>${escapeHtml(text)}</p>` })),
    ...document.lists.map(({ items, box }) => ({ top: box.y, html: listHtml(items) })),
    ...document.tables.map((table) => ({ top: table.box.y, html: tableHtml(table) }))
  ].sort((a, b) => a.top - b.top);
}
