import { desktop } from "@chain/sdk";
import type { AgentUsageRow } from "../../../shared/lib/db";

export type UsageSummary = { invocation_count: number; known_cost_count: number; total_cost: number | null; last_used: string | null };

export async function recordUsage(usage: Omit<AgentUsageRow, "id" | "invoked_at">) {
  await desktop.storage.execute(`
    INSERT INTO agent_usage (agent_connection_id, conversation_id, duration_ms, input_tokens, output_tokens, cost_usd, exit_code)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [usage.agent_connection_id, usage.conversation_id, usage.duration_ms, usage.input_tokens, usage.output_tokens, usage.cost_usd, usage.exit_code]);
}

export async function getUsageSummary(connectionId: number) {
  const [summary] = await desktop.storage.query<UsageSummary>(`
    SELECT count(*) AS invocation_count, count(cost_usd) AS known_cost_count,
      sum(cost_usd) AS total_cost, max(invoked_at) AS last_used
    FROM agent_usage WHERE agent_connection_id = ?
  `, [connectionId]);
  return summary;
}
