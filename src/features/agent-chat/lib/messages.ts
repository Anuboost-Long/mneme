import { desktop } from "@chain/sdk";
import type { AgentMessageRow } from "../../../shared/lib/db";

export type AgentMessage = AgentMessageRow;

export function getMessages(conversationId: number) {
  return desktop.storage.query<AgentMessage>("SELECT * FROM agent_message WHERE conversation_id = ? ORDER BY id", [conversationId]);
}

export async function appendMessage(conversationId: number, role: AgentMessage["role"], content: string) {
  await desktop.storage.execute("INSERT INTO agent_message (conversation_id, role, content) VALUES (?, ?, ?)", [conversationId, role, content]);
}
