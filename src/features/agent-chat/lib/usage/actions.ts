import type { AgentUsageRow } from "@/shared/lib/db/schema/agent-usage";

import { insertUsage } from "./table";

export { getUsageSummary } from "./table";

export async function recordUsage(usage: Omit<AgentUsageRow, "id" | "invoked_at">) {
  await insertUsage(usage);
}
