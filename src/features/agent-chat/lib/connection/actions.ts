import { parseArgs } from "@/features/agent-chat/lib/presets";
import { getSettingId, putSetting } from "@/shared/lib/settings/actions";

import { deleteConnectionRow, insertConnection, updateConnectionColumns } from "./table";
import type { ConnectionInput } from "./types";

import { getConnections } from "./table";

export { getConnections } from "./table";

const defaultConnectionKey = "ai-actions.connection-id";

function columns(input: ConnectionInput) {
  if (!input.name.trim()) throw new Error("Enter a connection name.");
  if (!input.command.trim() || input.command.includes("\0"))
    throw new Error("Enter an executable name or path.");
  return {
    name: input.name.trim(),
    kind: input.kind,
    command: input.command.trim(),
    args: JSON.stringify(parseArgs(JSON.stringify(input.args)))
  };
}

export async function createConnection(input: ConnectionInput) {
  await insertConnection(columns(input));
}

export async function updateConnection(id: number, input: ConnectionInput) {
  await updateConnectionColumns(id, columns(input));
}

export async function deleteConnection(id: number) {
  await deleteConnectionRow(id);
}

export async function updateConnectionModel(id: number, model: string | null) {
  await updateConnectionColumns(id, { model: model?.trim() || null });
}

export function getDefaultConnectionId() {
  return getSettingId(defaultConnectionKey);
}

export async function setDefaultConnectionId(id: number) {
  await putSetting(defaultConnectionKey, String(id));
}

export async function getAgentConnection(connectionId?: number | null) {
  const [connections, defaultId] = await Promise.all([getConnections(), getDefaultConnectionId()]);
  return (
    connections.find((connection) => connection.id === connectionId) ??
    connections.find((connection) => connection.id === defaultId) ??
    connections[0] ??
    null
  );
}
