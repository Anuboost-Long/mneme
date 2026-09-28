import type { Migration } from "@chain/sdk";

// See docs/features/23-ai-context-profiles.md.
export const aiProfiles: Migration = {
  version: 13,
  sql: `
    CREATE TABLE ai_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      instructions TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    ALTER TABLE course ADD COLUMN ai_profile_id INTEGER REFERENCES ai_profile(id) ON DELETE SET NULL;
  `,
};
