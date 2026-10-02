import { desktop, sql, type SqlFragment } from "@chain/sdk";

import { getSetting, putSetting } from "../../../../shared/lib/settings/actions";
import {
  deleteConversationRows,
  getAttachedImageReferences,
  insertConversation,
  updateConversationColumns
} from "./table";

export { getConversation, getConversations } from "./table";

const retentionKey = "agent-chat.retention-days";

export function createConversation(connectionId: number) {
  return insertConversation(connectionId);
}

export async function renameConversation(id: number, title: string) {
  if (!title.trim()) throw new Error("Enter a conversation title.");
  await updateConversationColumns(id, { title: title.trim() });
}

export async function updateConversationSessionId(id: number, sessionId: string) {
  await updateConversationColumns(id, { external_session_id: sessionId });
}

async function deleteConversations(filter: SqlFragment) {
  for (const reference of await getAttachedImageReferences(filter))
    await desktop.files.delete(reference);
  await deleteConversationRows(filter);
}

export async function deleteConversation(id: number) {
  await deleteConversations(sql`id = ${id}`);
}

export async function deleteConversationsOlderThan(days: number) {
  if (!Number.isSafeInteger(days) || days <= 0)
    throw new Error("Retention must be a positive number of days.");
  await deleteConversations(sql`updated_at < datetime('now', ${`-${days} days`})`);
}

export async function getRetentionDays(): Promise<number | null> {
  const value = await getSetting(retentionKey);
  if (!value || value === "never") return null;
  const days = Number(value);
  return Number.isSafeInteger(days) && days > 0 ? days : null;
}

export async function setRetentionDays(days: number | null) {
  if (days !== null && (!Number.isSafeInteger(days) || days <= 0))
    throw new Error("Enter a positive number of days.");
  await putSetting(retentionKey, days === null ? "never" : String(days));
}

export async function cleanUpConversations() {
  const days = await getRetentionDays();
  if (days !== null) await deleteConversationsOlderThan(days);
}
