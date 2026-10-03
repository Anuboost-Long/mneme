import { desktop } from "@chain/sdk";

import { getActions } from "../action/actions";
import type { AiAction } from "../action/types";
import { packCatalog } from "./catalog";
import { packFileText, readPackFile } from "./file";
import { deletePackRow, getPackNames, insertPack } from "./table";
import type { ActionPack, CatalogPack, PackContent } from "./types";

export { getPacks } from "./table";
export { readPackFile };

export async function installCatalogPack({ key, icon, ...pack }: CatalogPack) {
  await insertPack({ ...pack, actions: pack.actions.map((action) => ({ ...action, icon })) }, key);
}

export async function installPack(pack: PackContent) {
  const names = new Set(await getPackNames());
  let name = pack.name;
  for (let copy = 2; names.has(name); copy++) name = `${pack.name} (${copy})`;
  await insertPack({ ...pack, name }, null);
}

export async function removePack(id: number) {
  await deletePackRow(id);
}

export function catalogPack(key: string | null) {
  return packCatalog.find((pack) => pack.key === key);
}

function packActions(actions: AiAction[]) {
  return actions.map(({ name, prompt, icon, scope, output, pageTypes }) => ({
    name,
    prompt,
    icon,
    scope,
    output,
    pageTypes
  }));
}

export async function exportPack(pack: ActionPack) {
  const actions = (await getActions()).filter((action) => action.packId === pack.id);
  return savePackFile({
    name: pack.name,
    description: pack.description,
    area: pack.area,
    actions: packActions(actions)
  });
}

export async function exportStandaloneActions() {
  const actions = (await getActions()).filter((action) => action.packId === null);
  if (actions.length === 0) throw new Error("You have no actions outside a pack to export.");
  return savePackFile({
    name: "My actions",
    description: "",
    area: null,
    actions: packActions(actions)
  });
}

async function savePackFile(pack: PackContent) {
  const fileName = `${pack.name.replace(/[\\/:*?"<>|]/g, "-")}.mneme-pack.json`;
  const bytes = new TextEncoder().encode(packFileText(pack));
  try {
    const saved = await desktop.files.save(bytes, {
      suggestedName: fileName,
      extensions: ["json"]
    });
    return saved?.name ?? null;
  } catch (error) {
    if ((error as { code?: string } | null)?.code !== "UNSUPPORTED") throw error;
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return fileName;
  }
}
