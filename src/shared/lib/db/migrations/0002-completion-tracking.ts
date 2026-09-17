import type { Migration } from "@chain/sdk";

// Adds what filtering needs across all three levels: a completion
// `status` (course + page — module already had one, as TEXT; see 0003
// for converting it to match), a 0-100 `progress`, and a `bookmarked`
// flag. `status`/`bookmarked` are numeric (see
// `src/features/courses/lib/completion-status.ts`), not TEXT — new
// columns can start out right, no conversion needed like 0003's.
export const completionTracking: Migration = {
  version: 2,
  sql: `
    ALTER TABLE course ADD COLUMN status INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE course ADD COLUMN progress INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE course ADD COLUMN bookmarked INTEGER NOT NULL DEFAULT 0;

    ALTER TABLE module ADD COLUMN progress INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE module ADD COLUMN bookmarked INTEGER NOT NULL DEFAULT 0;

    ALTER TABLE page ADD COLUMN status INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE page ADD COLUMN progress INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE page ADD COLUMN bookmarked INTEGER NOT NULL DEFAULT 0;
  `,
};
