import { desktop, sql } from "@chain/sdk";

type IconTable = "course" | "module" | "page";

const iconTable = (name: IconTable) =>
  desktop.storage.table<{ id: number; icon: string | null }>(name);

export const iconTables: IconTable[] = ["course", "module", "page"];

export function getInlineIcons(table: IconTable) {
  return iconTable(table)
    .where(sql`icon LIKE 'data:image/%'`)
    .all();
}

export async function replaceIcon(
  table: IconTable,
  id: number,
  from: string | null,
  to: string | null
) {
  const updated = await iconTable(table).update({ id, icon: from }, { icon: to });
  return updated.length > 0;
}
