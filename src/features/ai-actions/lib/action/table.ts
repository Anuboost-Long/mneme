import { desktop, sql, type Values } from "@chain/sdk";

import { savePositions } from "../../../../shared/lib/db/positions";
import type { AiActionRow } from "../../../../shared/lib/db/schema/ai-action";
import type { PageType } from "../../../courses/lib/page/types";
import type { ActionOutput, ActionScope, AiAction } from "./types";

const actionTable = () => desktop.storage.table<AiActionRow>("ai_action");

function toAction({ page_types, ...row }: AiActionRow): AiAction {
  return {
    ...row,
    scope: row.scope as ActionScope,
    output: row.output as ActionOutput,
    pageTypes: page_types ? (JSON.parse(page_types) as PageType[]) : null
  };
}

export async function getActions() {
  const rows = await actionTable().orderBy("position", "id").all();
  return rows.map(toAction);
}

export async function insertAction(
  values: Omit<Values<AiActionRow>, "position"> & { name: string; prompt: string }
) {
  await actionTable().insert({
    ...values,
    position: sql`SELECT COALESCE(MAX(position), -1) + 1 FROM ai_action`
  });
}

export async function updateActionColumns(id: number, changes: Values<AiActionRow>) {
  await actionTable().update(id, { ...changes, updated_at: sql`datetime('now')` });
}

export async function deleteActionRow(id: number) {
  await actionTable().delete(id);
}

export function saveActionPositions(ids: number[]) {
  return savePositions("ai_action", ids, 0);
}
