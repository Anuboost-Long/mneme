// Added in migration 0004-agent-chat.
export interface AgentUsageRow {
  id: number;
  agent_connection_id: number;
  conversation_id: number | null;
  invoked_at: string;
  duration_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  exit_code: number | null;
}
