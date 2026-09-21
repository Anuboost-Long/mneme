import { desktop } from "@chain/sdk";
import type { AgentConnectionRow } from "../../../shared/lib/db";
import { parseArgs } from "./presets";

export type AgentConnection = Omit<AgentConnectionRow, "args"> & { args: string[]; conversation_count: number };
export type ConnectionInput = Pick<AgentConnection, "name" | "kind" | "command" | "args">;

export async function getConnections(): Promise<AgentConnection[]> {
  const rows = await desktop.storage.query<AgentConnectionRow & { conversation_count: number }>(`
    SELECT c.*, (SELECT count(*) FROM agent_conversation WHERE agent_connection_id = c.id) AS conversation_count
    FROM agent_connection c ORDER BY c.name COLLATE NOCASE, c.id
  `);
  return rows.map((row) => ({ ...row, args: parseArgs(row.args ?? "[]") }));
}

function values(input: ConnectionInput) {
  if (!input.name.trim()) throw new Error("Enter a connection name.");
  if (!input.command.trim() || input.command.includes("\0")) throw new Error("Enter an executable name or path.");
  return [input.name.trim(), input.kind, input.command.trim(), JSON.stringify(parseArgs(JSON.stringify(input.args)))];
}

export async function createConnection(input: ConnectionInput) {
  await desktop.storage.execute("INSERT INTO agent_connection (name, kind, command, args) VALUES (?, ?, ?, ?)", values(input));
}

export async function updateConnection(id: number, input: ConnectionInput) {
  await desktop.storage.execute(
    "UPDATE agent_connection SET name = ?, kind = ?, command = ?, args = ?, updated_at = datetime('now') WHERE id = ?",
    [...values(input), id],
  );
}

export async function deleteConnection(id: number) {
  await desktop.storage.execute("DELETE FROM agent_connection WHERE id = ?", [id]);
}

// Model isn't part of a connection's locked identity (kind/command/args) —
// switching it doesn't invalidate a resumed CLI session, so it's editable
// any time, independent of updateConnection's identity fields.
export async function updateConnectionModel(id: number, model: string | null) {
  await desktop.storage.execute(
    "UPDATE agent_connection SET model = ?, updated_at = datetime('now') WHERE id = ?",
    [model?.trim() || null, id],
  );
}
