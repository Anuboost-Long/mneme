// Added in migration 0004-agent-chat.
export interface AgentMessageRow {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "tool" | "error";
  content: string;
  created_at: string;
  // Added in migration 0015 — JSON array of { name, size, kind, count,
  // preview, truncated, reference? } (see agent-chat/lib/attachments.ts),
  // null when none. `reference` is an image's desktop.files copy.
  attachments: string | null;
}
