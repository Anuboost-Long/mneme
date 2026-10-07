import { PageType } from "@/features/courses/lib/page/types";
import type { CustomPageTypeRow } from "@/shared/lib/db/schema/custom-page-type";
import type { PageRow } from "@/shared/lib/db/schema/page";
import { desktop, sql } from "@chain/sdk";

import { customTypeValue } from "./types";

const customTypeTable = () => desktop.storage.table<CustomPageTypeRow>("custom_page_type");

export function getCustomPageTypes() {
  return customTypeTable().orderBy("position", "id").all();
}

export async function countPagesOfType(type: number) {
  const [row] = await desktop.storage.query<{ pages: number }>(
    "SELECT count(*) AS pages FROM page WHERE type = ? AND deleted_at IS NULL",
    [type]
  );
  return row?.pages ?? 0;
}

export function insertCustomPageType(name: string) {
  return customTypeTable().insert({
    name,
    position: sql`COALESCE((SELECT MAX(position) FROM custom_page_type), 0) + 1`
  });
}

export async function setCustomPageTypeName(id: number, name: string) {
  await customTypeTable().update(id, { name, updated_at: sql`datetime('now')` });
}

export function deleteCustomPageTypeRow(id: number) {
  return desktop.storage.transaction(async (tx) => {
    await tx
      .table<PageRow>("page")
      .update({ type: customTypeValue(id) }, { type: PageType.Custom });
    await tx.table<CustomPageTypeRow>("custom_page_type").delete({ id });
  });
}
