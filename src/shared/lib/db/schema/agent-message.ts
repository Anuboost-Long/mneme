// Added in migration 0004-agent-chat.
export interface AgentMessageRow {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "tool" | "error";
  content: string;
  created_at: string;
}
