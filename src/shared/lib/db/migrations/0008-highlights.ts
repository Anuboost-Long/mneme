import type { Migration } from "@chain/sdk";

// Backs the highlight feature: users mark important passages of a page's
// content (a TipTap "highlight" mark, extended with a `ref` attribute —
// see editor/HighlightMark.ts) and see them collected across a whole
// module from ModulePage's "Highlights" button. `ref` ties a row back to
// the exact <mark> in the page's own HTML that
// features/courses/lib/highlights.ts's syncPageHighlights keeps this
// table in step with. `module_id` is a denormalized copy of the owning
// page's module_id (pages are never re-parented to a different module —
// no code path changes page.module_id after creation), so both
// page-scoped and module-scoped lookups are a flat WHERE with no join.
//
// No `ON DELETE CASCADE` enforcement from SQLite itself (this app never
// turns on `PRAGMA foreign_keys` — see agent_conversation_delete in
// 0004/0006 for the same reasoning), so highlight_page_delete does that
// cleanup explicitly. Firing on `page`'s own delete also covers
// deleteModule's bulk `DELETE FROM page WHERE module_id = ?` — SQLite
// triggers fire once per row a DELETE matches, not once per statement.
export const highlights: Migration = {
  version: 8,
  sql: `
    CREATE TABLE highlight (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL REFERENCES page(id) ON DELETE CASCADE,
      module_id INTEGER NOT NULL,
      ref TEXT NOT NULL,
      text TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(page_id, ref)
    );

    CREATE INDEX highlight_page ON highlight(page_id);
    CREATE INDEX highlight_module ON highlight(module_id);

    CREATE TRIGGER highlight_page_delete BEFORE DELETE ON page BEGIN
      DELETE FROM highlight WHERE page_id = OLD.id;
    END;
  `,
};
