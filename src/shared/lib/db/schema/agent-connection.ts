// Added in migration 0004-agent-chat; kind widened in 0005-widen-agent-kind;
// model added in 0007-agent-connection-model.
export interface AgentConnectionRow {
  id: number;
  name: string;
  kind: "claude" | "codex" | "gemini" | "copilot" | "cursor" | "custom";
  command: string;
  args: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}
