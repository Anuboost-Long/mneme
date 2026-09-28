import { desktop } from "@chain/sdk";
import type { AiActionRow } from "../../../shared/lib/db";
import type { PageType } from "../../courses/lib/pages";
import { getConnections } from "../../agent-chat/lib/connections";

// What content an action is given: the selection (or the whole page when
// nothing is selected), every page of the current module, or of the course.
export enum ActionScope {
  Page = 1,
  Module = 2,
  Course = 3,
}

export enum ActionOutput {
  Preview = 1,
  InsertBelow = 2,
  NewPage = 3,
}

export type AiAction = Omit<AiActionRow, "scope" | "output" | "page_types" | "icon"> & {
  icon: string | null;
  scope: ActionScope;
  output: ActionOutput;
  // null = every page type; only meaningful for module/course scope.
  pageTypes: PageType[] | null;
};

export type ActionInput = Pick<AiAction, "name" | "prompt" | "icon" | "scope" | "output" | "pageTypes">;

const connectionKey = "ai-actions.connection-id";

function fromRow({ page_types, ...row }: AiActionRow): AiAction {
  return { ...row, scope: row.scope as ActionScope, output: row.output as ActionOutput, pageTypes: page_types ? (JSON.parse(page_types) as PageType[]) : null };
}

function values(input: ActionInput) {
  if (!input.name.trim()) throw new Error("Enter a name for the action.");
  if (!input.prompt.trim()) throw new Error("Enter the instructions for the action.");
  const pageTypes = input.scope !== ActionScope.Page && input.pageTypes?.length ? JSON.stringify(input.pageTypes) : null;
  return [input.name.trim(), input.prompt.trim(), input.icon, input.scope, input.output, pageTypes];
}

export async function getActions() {
  const rows = await desktop.storage.query<AiActionRow>("SELECT * FROM ai_action ORDER BY position, id");
  return rows.map(fromRow);
}

export async function createAction(input: ActionInput) {
  await desktop.storage.execute(
    "INSERT INTO ai_action (name, prompt, icon, scope, output, page_types, position) VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM ai_action))",
    values(input),
  );
}

export async function updateAction(id: number, input: ActionInput) {
  await desktop.storage.execute(
    "UPDATE ai_action SET name = ?, prompt = ?, icon = ?, scope = ?, output = ?, page_types = ?, updated_at = datetime('now') WHERE id = ?",
    [...values(input), id],
  );
}

export async function duplicateAction(action: AiAction) {
  await createAction({ ...action, name: `${action.name} (copy)` });
}

export async function deleteAction(id: number) {
  await desktop.storage.execute("DELETE FROM ai_action WHERE id = ?", [id]);
}

export async function saveActionOrder(actions: AiAction[]) {
  for (const [position, action] of actions.entries()) {
    await desktop.storage.execute("UPDATE ai_action SET position = ? WHERE id = ?", [position, action.id]);
  }
}

export async function getActionConnectionId(): Promise<number | null> {
  const [row] = await desktop.storage.query<{ value: string | null }>("SELECT value FROM settings WHERE key = ?", [connectionKey]);
  const id = Number(row?.value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function getActionConnection() {
  const [connections, savedId] = await Promise.all([getConnections(), getActionConnectionId()]);
  return connections.find((connection) => connection.id === savedId) ?? connections[0] ?? null;
}

export async function setActionConnectionId(id: number) {
  await desktop.storage.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [connectionKey, String(id)]);
}
