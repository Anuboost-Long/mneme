// Added in migration 0004-agent-chat.
export interface AgentConversationRow {
  id: number;
  agent_connection_id: number;
  title: string | null;
  external_session_id: string | null;
  created_at: string;
  updated_at: string;
}
