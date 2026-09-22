import type { Migration } from "@chain/sdk";

// Previously, syncPageHighlights deleted a highlight outright the moment
// its <mark> vanished from the page's saved content — including when an
// unrelated edit (most often the AI agent's update_page tool rewriting
// the whole page) just failed to reproduce a mark it had no reason to
// touch. Now a highlight whose exact text genuinely can't be found in
// the new content is flagged here instead of deleted, so the user can
// decide whether to keep it as a standalone note or remove it — see
// features/courses/lib/highlights.ts's reconcileHighlights/
// syncPageHighlights and ModuleHighlightsPage's orphaned-highlight UI.
export const highlightOrphaning: Migration = {
  version: 10,
  sql: `
    ALTER TABLE highlight ADD COLUMN orphaned_at TEXT;
  `,
};
