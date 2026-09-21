import type { Migration } from "@chain/sdk";

// 0008 named this column `text` when it held each mark's plain
// textContent. The sync logic now keeps each highlight's original inner
// HTML instead — preserving formatting, and for a selection spanning
// multiple blocks, the paragraph breaks between its fragments (see
// features/courses/lib/highlights.ts's parseHighlightMarks) — so the
// column is renamed to match what it actually holds.
export const highlightHtml: Migration = {
  version: 9,
  sql: `
    ALTER TABLE highlight RENAME COLUMN text TO html;
  `,
};
