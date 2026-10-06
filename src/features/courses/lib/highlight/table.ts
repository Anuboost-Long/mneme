import type { HighlightRow } from "@/shared/lib/db/schema/highlight";
import { desktop, sql } from "@chain/sdk";

const UPSERT_BATCH = 200;

const highlightTable = () => desktop.storage.table<HighlightRow>("highlight");

export function getModuleHighlights(moduleId: number) {
  return highlightTable()
    .where({ module_id: moduleId })
    .where(sql`page_id IN (SELECT id FROM page WHERE deleted_at IS NULL)`)
    .orderBy("page_id", "position")
    .all();
}

export async function orphanHighlightsExcept(pageId: number, keptRefs: string[]) {
  const target = keptRefs.length
    ? sql`page_id = ${pageId} AND orphaned_at IS NULL AND ref NOT IN ${keptRefs}`
    : sql`page_id = ${pageId} AND orphaned_at IS NULL`;
  await highlightTable().update(target, { orphaned_at: sql`datetime('now')` });
}

export async function upsertHighlights(
  rows: Pick<HighlightRow, "page_id" | "module_id" | "ref" | "html" | "position">[]
) {
  for (let start = 0; start < rows.length; start += UPSERT_BATCH) {
    const batch = rows.slice(start, start + UPSERT_BATCH);
    await desktop.storage.execute(
      `INSERT INTO highlight (page_id, module_id, ref, html, position) VALUES ${batch.map(() => "(?, ?, ?, ?, ?)").join(", ")}
       ON CONFLICT(page_id, ref) DO UPDATE SET html = excluded.html, position = excluded.position, module_id = excluded.module_id, orphaned_at = NULL`,
      batch.flatMap((row) => [row.page_id, row.module_id, row.ref, row.html, row.position])
    );
  }
}

export async function deleteHighlightRow(id: number) {
  await highlightTable().delete(id);
}

export async function clearHighlightOrphaned(id: number) {
  await highlightTable().update(id, { orphaned_at: null });
}
