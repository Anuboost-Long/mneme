import type { Migration } from "@chain/sdk";

// `module.status` and `page.type` shipped in 0001 as TEXT ('not_started',
// 'lesson', ...). Every other enum-like column now stores its
// TypeScript enum's numeric value directly (see
// `src/features/courses/lib/completion-status.ts` and
// `src/features/courses/lib/pages.ts`'s `PageType`), so these two get
// converted to match: add an INTEGER column, translate the old TEXT
// values across, then drop the TEXT column and rename the new one into
// its place. The CASE mappings below must stay in the same order as
// each enum's declaration.
export const numericEnums: Migration = {
  version: 3,
  sql: `
    ALTER TABLE module ADD COLUMN status_int INTEGER NOT NULL DEFAULT 1;
    UPDATE module SET status_int = CASE status
      WHEN 'not_started' THEN 1
      WHEN 'in_progress' THEN 2
      WHEN 'completed' THEN 3
      WHEN 'revision_needed' THEN 4
      ELSE 1
    END;
    ALTER TABLE module DROP COLUMN status;
    ALTER TABLE module RENAME COLUMN status_int TO status;

    ALTER TABLE page ADD COLUMN type_int INTEGER NOT NULL DEFAULT 1;
    UPDATE page SET type_int = CASE type
      WHEN 'lesson' THEN 1
      WHEN 'lecture' THEN 2
      WHEN 'exercise' THEN 3
      WHEN 'discussion' THEN 4
      WHEN 'assignment' THEN 5
      WHEN 'notes' THEN 6
      WHEN 'reading' THEN 7
      WHEN 'revision' THEN 8
      WHEN 'custom' THEN 9
      ELSE 1
    END;
    ALTER TABLE page DROP COLUMN type;
    ALTER TABLE page RENAME COLUMN type_int TO type;
  `,
};
