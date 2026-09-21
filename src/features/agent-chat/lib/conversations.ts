import { desktop } from "@chain/sdk";
import type { AgentConversationRow } from "../../../shared/lib/db";

export type Conversation = AgentConversationRow;

export function getConversations() {
  return desktop.storage.query<Conversation>("SELECT * FROM agent_conversation ORDER BY updated_at DESC, id DESC");
}

export async function getConversation(id: number) {
  const [conversation] = await desktop.storage.query<Conversation>("SELECT * FROM agent_conversation WHERE id = ?", [id]);
  return conversation;
}

export async function createConversation(connectionId: number) {
  const result = await desktop.storage.execute("INSERT INTO agent_conversation (agent_connection_id) VALUES (?)", [connectionId]);
  const conversation = await getConversation(result.lastInsertId);
  if (!conversation) throw new Error("The saved conversation could not be found.");
  return conversation;
}

export async function renameConversation(id: number, title: string) {
  if (!title.trim()) throw new Error("Enter a conversation title.");
  await desktop.storage.execute("UPDATE agent_conversation SET title = ?, updated_at = datetime('now') WHERE id = ?", [title.trim(), id]);
}

export async function deleteConversation(id: number) {
  await desktop.storage.execute("DELETE FROM agent_conversation WHERE id = ?", [id]);
}

export async function updateConversationSessionId(id: number, sessionId: string) {
  await desktop.storage.execute("UPDATE agent_conversation SET external_session_id = ?, updated_at = datetime('now') WHERE id = ?", [sessionId, id]);
}

export async function deleteConversationsOlderThan(days: number) {
  if (!Number.isSafeInteger(days) || days <= 0) throw new Error("Retention must be a positive number of days.");
  await desktop.storage.execute("DELETE FROM agent_conversation WHERE updated_at < datetime('now', ?)", [`-${days} days`]);
}
