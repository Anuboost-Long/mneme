import type { Migration } from "@chain/sdk";

// Phase 22's custom actions — see docs/features/22-custom-ai-actions.md.
// `output_mode` (TEXT, 0001) was never read by any code, so it's replaced
// with a numeric enum column rather than kept, per the convention in
// features/courses/lib/completion-status.ts. `scope`/`output` values are
// ActionScope/ActionOutput in features/ai-actions/lib/actions.ts;
// `page_types` is a JSON array of PageType, NULL meaning every type.
export const customAiActions: Migration = {
  version: 12,
  sql: `
    ALTER TABLE ai_action DROP COLUMN output_mode;
    ALTER TABLE ai_action ADD COLUMN icon TEXT;
    ALTER TABLE ai_action ADD COLUMN scope INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE ai_action ADD COLUMN output INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE ai_action ADD COLUMN page_types TEXT;
  `,
};
