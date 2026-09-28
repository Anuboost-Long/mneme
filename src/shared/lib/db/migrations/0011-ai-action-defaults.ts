import type { Migration } from "@chain/sdk";

// Phase 21's quick actions are the first code to read `ai_action` (created,
// unused, in 0001). Adds the menu order and seeds the default actions — see
// docs/features/21-ai-quick-actions.md. Each prompt is only the task; the
// content it runs on and the "reply in Markdown" framing are added by
// features/ai-actions/lib/runAction.ts at run time.
export const aiActionDefaults: Migration = {
  version: 11,
  sql: `
    ALTER TABLE ai_action ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

    INSERT INTO ai_action (name, prompt, position) VALUES
      ('Summarize', 'Summarize this content in a few short paragraphs, keeping the key ideas and any important terms.', 0),
      ('Explain', 'Explain this content clearly for a student meeting it for the first time. Define technical terms and use a short example where it helps.', 1),
      ('Simplify', 'Rewrite this content in simpler language while keeping its meaning and any technical terms that matter.', 2),
      ('Translate to English', 'Translate this content into English, keeping its structure and formatting.', 3),
      ('Find key points', 'List the key points of this content as a concise bulleted list.', 4),
      ('Create revision notes', 'Turn this content into revision notes: short headings, bulleted key facts, and definitions of important terms.', 5),
      ('Extract tasks', 'List every task, assignment, deadline, or action item in this content as a checklist. If there are none, say so.', 6),
      ('Organize notes', 'Reorganize this content into well-structured notes with clear headings, grouping related points together without losing any information.', 7);
  `,
};
