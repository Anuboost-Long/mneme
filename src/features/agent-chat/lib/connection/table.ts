import { desktop, sql, type Values } from "@chain/sdk";

import type { AgentConnectionRow } from "../../../../shared/lib/db/schema/agent-connection";
import { parseArgs } from "../presets";
import type { AgentConnection } from "./types";

const connectionTable = () => desktop.storage.table<AgentConnectionRow>("agent_connection");

export async function getConnections(): Promise<AgentConnection[]> {
  const rows = await desktop.storage.query<AgentConnectionRow & { conversation_count: number }>(
    `SELECT c.*, (SELECT count(*) FROM agent_conversation WHERE agent_connection_id = c.id) AS conversation_count
     FROM agent_connection c ORDER BY c.name COLLATE NOCASE, c.id`,
    []
  );
  return rows.map((row) => ({ ...row, args: parseArgs(row.args ?? "[]") }));
}

export async function insertConnection(
  values: Values<AgentConnectionRow> & Pick<AgentConnectionRow, "name" | "kind" | "command">
) {
  await connectionTable().insert(values);
}

export async function updateConnectionColumns(id: number, changes: Values<AgentConnectionRow>) {
  await connectionTable().update(id, { ...changes, updated_at: sql`datetime('now')` });
}

export async function deleteConnectionRow(id: number) {
  await connectionTable().delete(id);
}
