import type { Migration } from "@chain/sdk";

// A plain nullable column add, like 0007. Holds a JSON array describing
// the files a user message carried (name, size, a short preview) — the
// full file text went to the agent and isn't kept.
export const agentMessageAttachments: Migration = {
  version: 15,
  sql: `
    ALTER TABLE agent_message ADD COLUMN attachments TEXT;
  `,
};
