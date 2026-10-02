import { parseArgs } from "../presets";
import { deleteConnectionRow, insertConnection, updateConnectionColumns } from "./table";
import type { ConnectionInput } from "./types";

export { getConnections } from "./table";

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
