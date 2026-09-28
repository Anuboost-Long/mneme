/**
 * Current shape of the `ai_profile` table. Created in 0013; read by
 * features/ai-profiles/lib/profiles.ts. See `./course.ts` for the file's
 * conventions.
 */
export interface AiProfileRow {
  id: number; // INTEGER PRIMARY KEY AUTOINCREMENT
  name: string; // TEXT NOT NULL
  language: string | null; // TEXT — added in 0014; a key of `languages` (preferences.ts), NULL = no preference
  explanation_level: number; // INTEGER NOT NULL DEFAULT 1 — added in 0014; ExplanationLevel
  tone: number; // INTEGER NOT NULL DEFAULT 1 — added in 0014; Tone
  answer_length: number; // INTEGER NOT NULL DEFAULT 1 — added in 0014; AnswerLength
  keep_terms: number; // INTEGER NOT NULL DEFAULT 0 (0 | 1) — added in 0014
  use_examples: number; // INTEGER NOT NULL DEFAULT 0 (0 | 1) — added in 0014
  hints_for_assessed: number; // INTEGER NOT NULL DEFAULT 0 (0 | 1) — added in 0014
  created_at: string; // TEXT NOT NULL DEFAULT (datetime('now'))
  updated_at: string; // TEXT NOT NULL DEFAULT (datetime('now'))
  // instructions (TEXT, 0013) was dropped in 0014 for the fixed settings above.
}
