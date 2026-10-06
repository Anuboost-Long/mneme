import type { AgentMessageRow } from "@/shared/lib/db/schema/agent-message";
import { desktop, type Values } from "@chain/sdk";

const messageTable = () => desktop.storage.table<AgentMessageRow>("agent_message");

export function getMessages(conversationId: number) {
  return messageTable().where({ conversation_id: conversationId }).orderBy("id").all();
}

export async function insertMessage(
  values: Values<AgentMessageRow> & Pick<AgentMessageRow, "conversation_id" | "role" | "content">
) {
  await messageTable().insert(values);
}
