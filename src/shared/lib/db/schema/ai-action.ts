/**
 * Current shape of the `ai_action` table. No app code reads/writes this
 * yet — it exists for a later phase; kept here so the whole database is
 * visible in one place. See `./course.ts` for the file's conventions.
 */
export interface AiActionRow {
  id: number; // INTEGER PRIMARY KEY AUTOINCREMENT
  name: string; // TEXT NOT NULL
  prompt: string; // TEXT NOT NULL
  output_mode: string; // TEXT NOT NULL DEFAULT 'ai_panel'
  created_at: string; // TEXT NOT NULL DEFAULT (datetime('now'))
  updated_at: string; // TEXT NOT NULL DEFAULT (datetime('now'))
}
