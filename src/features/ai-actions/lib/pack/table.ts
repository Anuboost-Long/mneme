import { desktop, sql } from "@chain/sdk";

import type { ActionPackRow } from "../../../../shared/lib/db/schema/action-pack";
import type { AiActionRow } from "../../../../shared/lib/db/schema/ai-action";
import type { ActionPack, PackArea, PackContent } from "./types";

const packTable = () => desktop.storage.table<ActionPackRow>("action_pack");

function toPack({ catalog_key, area, ...row }: ActionPackRow): ActionPack {
  return { ...row, catalogKey: catalog_key, area: area as PackArea | null };
}

export async function getPacks() {
  const rows = await packTable().orderBy("installed_at", "id").all();
  return rows.map(toPack);
}

export async function getPackNames() {
  const rows = await packTable().all();
  return rows.map((row) => row.name);
}

export function insertPack(pack: PackContent, catalogKey: string | null) {
  return desktop.storage.transaction(async (tx) => {
    const { id } = await tx.table<ActionPackRow>("action_pack").insert({
      catalog_key: catalogKey,
      name: pack.name,
      description: pack.description,
      area: pack.area
    });
    for (const action of pack.actions)
      await tx.table<AiActionRow>("ai_action").insert({
        name: action.name,
        prompt: action.prompt,
        icon: action.icon,
        scope: action.scope,
        output: action.output,
        page_types: action.pageTypes?.length ? JSON.stringify(action.pageTypes) : null,
        pack_id: id,
        position: sql`SELECT COALESCE(MAX(position), -1) + 1 FROM ai_action`
      });
  });
}

export async function deletePackRow(id: number) {
  await packTable().delete(id);
}
