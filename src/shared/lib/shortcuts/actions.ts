import { getSetting, putSetting } from "@/shared/lib/settings/actions";

import { shortcuts, type Bindings } from "./types";

const settingKey = "keyboard.shortcuts";

export async function getShortcutOverrides(): Promise<Partial<Bindings>> {
  try {
    const saved = JSON.parse((await getSetting(settingKey)) ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(
      shortcuts
        .filter(({ id }) => typeof saved[id] === "string")
        .map(({ id }) => [id, saved[id] as string])
    );
  } catch {
    return {};
  }
}

export async function saveShortcutOverrides(overrides: Partial<Bindings>) {
  await putSetting(settingKey, JSON.stringify(overrides));
}
