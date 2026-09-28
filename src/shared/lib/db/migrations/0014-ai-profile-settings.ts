import type { Migration } from "@chain/sdk";

// See docs/features/23-ai-context-profiles.md.
export const aiProfileSettings: Migration = {
  version: 14,
  sql: `
    ALTER TABLE ai_profile DROP COLUMN instructions;
    ALTER TABLE ai_profile ADD COLUMN language TEXT;
    ALTER TABLE ai_profile ADD COLUMN explanation_level INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE ai_profile ADD COLUMN tone INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE ai_profile ADD COLUMN answer_length INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE ai_profile ADD COLUMN keep_terms INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE ai_profile ADD COLUMN use_examples INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE ai_profile ADD COLUMN hints_for_assessed INTEGER NOT NULL DEFAULT 0;
  `,
};
