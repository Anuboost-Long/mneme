import { desktop } from "@chain/sdk";

import type { SettingsRow } from "../db/schema/settings";

const settingsTable = () => desktop.storage.table<SettingsRow>("settings");

export async function getSetting(key: string) {
  return (await settingsTable().where({ key }).first())?.value ?? null;
}

export async function putSetting(key: string, value: string) {
  await desktop.storage.execute(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
    [key, value]
  );
}

export async function claimSetting(key: string, value: string) {
  const { rowsAffected } = await desktop.storage.execute(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING",
    [key, value]
  );
  return rowsAffected > 0;
}

export async function deleteSetting(key: string, value?: string) {
  await settingsTable().delete({ key, value });
}
