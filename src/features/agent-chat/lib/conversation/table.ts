import { desktop, sql, type SqlFragment, type Values } from "@chain/sdk";

import type { AgentConversationRow } from "../../../../shared/lib/db/schema/agent-conversation";

const conversationTable = () => desktop.storage.table<AgentConversationRow>("agent_conversation");

export function getConversations() {
  return conversationTable().orderBy("updated_at desc", "id desc").all();
}

export function getConversation(id: number) {
  return conversationTable().find(id);
}

export function insertConversation(connectionId: number) {
  return conversationTable().insert({ agent_connection_id: connectionId });
}

export async function updateConversationColumns(id: number, changes: Values<AgentConversationRow>) {
  await conversationTable().update(id, { ...changes, updated_at: sql`datetime('now')` });
}

export async function getAttachedImageReferences(conversations: SqlFragment) {
  const filter = sql`agent_message.conversation_id IN (SELECT id FROM agent_conversation WHERE ${conversations})`;
  const rows = await desktop.storage.query<{ reference: string }>(
    `SELECT json_extract(file.value, '$.reference') AS reference FROM agent_message, json_each(agent_message.attachments) AS file
     WHERE agent_message.attachments IS NOT NULL AND json_extract(file.value, '$.reference') IS NOT NULL
       AND ${filter.sql}`,
    [...filter.params]
  );
  return rows.map((row) => row.reference);
}

export async function deleteConversationRows(filter: SqlFragment) {
  await conversationTable().delete(filter);
}
