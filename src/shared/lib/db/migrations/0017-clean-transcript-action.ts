import type { Migration } from "@chain/sdk";

// Written by hand (`chain migration add clean-transcript-action --empty`), for changes the
// schema classes can't express, like moving data. Fill in both directions.
export const cleanTranscriptAction: Migration = {
  version: 17,
  name: "clean-transcript-action",
  // A built-in action for Phase 17 transcripts, added after the user's own
  // actions so their order is untouched.
  sql: `
    INSERT INTO ai_action (name, prompt, position)
      SELECT 'Clean transcript', 'Clean up this speech transcript: fix punctuation, capitalization and obvious mis-hearings, remove filler words and false starts, and group it into readable paragraphs. Keep the speaker''s meaning and every point they made; do not summarize.', COALESCE(MAX(position), -1) + 1
      FROM ai_action;
  `,
  down: `
    DELETE FROM ai_action WHERE name = 'Clean transcript';
  `
};
