import type { AgentActivityRow } from "@/shared/lib/db/schema/agent-activity";
import { desktop } from "@chain/sdk";

import type { AgentActivity, NewActivity } from "./types";

const KEPT_ACTIVITY = 1000;

const activityTable = () => desktop.storage.table<AgentActivityRow>("agent_activity");

export async function insertActivity(activity: NewActivity) {
  await activityTable().insert({ ...activity, detail: activity.detail ?? null });
  await desktop.storage.execute(
    "DELETE FROM agent_activity WHERE id <= (SELECT max(id) FROM agent_activity) - ?",
    [KEPT_ACTIVITY]
  );
}

export function getRecentActivity(limit: number) {
  return desktop.storage.query<AgentActivity>(
    `SELECT agent_activity.*, agent_conversation.title AS conversation_title
     FROM agent_activity LEFT JOIN agent_conversation ON agent_conversation.id = agent_activity.conversation_id
     ORDER BY agent_activity.id DESC LIMIT ?`,
    [limit]
  );
}

export async function deleteAllActivity() {
  await desktop.storage.execute("DELETE FROM agent_activity");
}
