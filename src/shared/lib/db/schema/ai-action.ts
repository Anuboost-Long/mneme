/**
 * Current shape of the `ai_action` table. Created in 0001; first read by
 * Phase 21's quick actions (features/ai-actions/lib/actions.ts). See
 * `./course.ts` for the file's conventions.
 */
export interface AiActionRow {
  id: number; // INTEGER PRIMARY KEY AUTOINCREMENT
  name: string; // TEXT NOT NULL
  prompt: string; // TEXT NOT NULL
  position: number; // INTEGER NOT NULL DEFAULT 0 — added in 0011, which also seeds the defaults
  icon: string | null; // TEXT — added in 0012; a key of actionIcons, NULL = no icon
  scope: number; // INTEGER NOT NULL DEFAULT 1 — added in 0012; ActionScope
  output: number; // INTEGER NOT NULL DEFAULT 1 — added in 0012; ActionOutput
  page_types: string | null; // TEXT — added in 0012; JSON array of PageType, NULL = all
  created_at: string; // TEXT NOT NULL DEFAULT (datetime('now'))
  updated_at: string; // TEXT NOT NULL DEFAULT (datetime('now'))
  // output_mode (TEXT, 0001) was dropped in 0012 without ever being read.
}
