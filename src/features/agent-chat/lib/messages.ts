import { desktop } from "@chain/sdk";
import type { AgentMessageRow } from "../../../shared/lib/db";
import type { AttachmentInfo } from "./attachments";

export type AgentMessage = AgentMessageRow;

export function getMessages(conversationId: number) {
  return desktop.storage.query<AgentMessage>("SELECT * FROM agent_message WHERE conversation_id = ? ORDER BY id", [conversationId]);
}

export async function appendMessage(conversationId: number, role: AgentMessage["role"], content: string, attachments: AttachmentInfo[] = []) {
  const attachmentsJson = attachments.length ? JSON.stringify(attachments.map(({ name, size, kind, count, preview, truncated, reference }) => ({ name, size, kind, count, preview, truncated, reference }))) : null;
  await desktop.storage.execute("INSERT INTO agent_message (conversation_id, role, content, attachments) VALUES (?, ?, ?, ?)", [conversationId, role, content, attachmentsJson]);
}
