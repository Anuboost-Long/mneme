import type { Migration } from "@chain/sdk";

// A plain nullable column add — no CHECK constraint involved, so unlike
// 0005's `kind` widening this doesn't need a table rebuild.
export const agentConnectionModel: Migration = {
  version: 7,
  sql: `
    ALTER TABLE agent_connection ADD COLUMN model TEXT;
  `,
};
