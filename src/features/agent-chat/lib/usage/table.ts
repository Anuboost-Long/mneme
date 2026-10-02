import { desktop } from "@chain/sdk";

import type { AgentUsageRow } from "../../../../shared/lib/db/schema/agent-usage";
import type { UsageSummary } from "./types";

export async function insertUsage(usage: Omit<AgentUsageRow, "id" | "invoked_at">) {
  await desktop.storage.table<AgentUsageRow>("agent_usage").insert(usage);
}

export async function getUsageSummary(connectionId: number) {
  const [summary] = await desktop.storage.query<UsageSummary>(
    `SELECT count(*) AS invocation_count, count(cost_usd) AS known_cost_count,
       sum(cost_usd) AS total_cost, max(invoked_at) AS last_used
     FROM agent_usage WHERE agent_connection_id = ?`,
    [connectionId]
  );
  return summary;
}
