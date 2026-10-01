import { desktop } from "@chain/sdk";
import { deleteConversationsOlderThan } from "./conversations";

const key = "agent-chat.retention-days";

export async function getRetentionDays(): Promise<number | null> {
  const [row] = await desktop.storage.query<{ value: string | null }>("SELECT value FROM settings WHERE key = ?", [key]);
  if (!row?.value || row.value === "never") return null;
  const days = Number(row.value);
  return Number.isSafeInteger(days) && days > 0 ? days : null;
}

export async function setRetentionDays(days: number | null) {
  if (days !== null && (!Number.isSafeInteger(days) || days <= 0)) throw new Error("Enter a positive number of days.");
  await desktop.storage.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')", [key, days === null ? "never" : String(days)]);
}

export async function cleanUpConversations() {
  const days = await getRetentionDays();
  if (days !== null) await deleteConversationsOlderThan(days);
}
