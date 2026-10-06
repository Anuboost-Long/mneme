import type { ModulePrepRow } from "@/shared/lib/db/schema/module-prep";
import type { PageDigestRow } from "@/shared/lib/db/schema/page-digest";
import { desktop } from "@chain/sdk";

import type { ModulePrep } from "./types";

type PrepColumns = Partial<
  Pick<
    ModulePrepRow,
    "topics" | "summary_page_id" | "notes_page_id" | "quiz_id" | "unread" | "prepared_at"
  >
>;

export async function getModulePrep(moduleId: number): Promise<ModulePrep | null> {
  const [row] = await desktop.storage.query<ModulePrepRow>(
    `SELECT module_prep.* FROM module_prep
     JOIN module ON module.id = module_prep.module_id AND module.deleted_at IS NULL
     WHERE module_prep.module_id = ?`,
    [moduleId]
  );
  return row ? { ...row, topics: JSON.parse(row.topics), unread: JSON.parse(row.unread) } : null;
}

export async function setPrepColumns(moduleId: number, columns: PrepColumns) {
  const names = Object.keys(columns);
  if (!names.length) return;
  await desktop.storage.execute(
    `INSERT INTO module_prep (module_id, ${names.join(", ")}) VALUES (?, ${names.map(() => "?").join(", ")})
     ON CONFLICT(module_id) DO UPDATE SET ${names.map((name) => `${name} = excluded.${name}`).join(", ")}`,
    [moduleId, ...Object.values(columns)]
  );
}

export async function getDigest(pageId: number, sourceHash: string) {
  const row = await desktop.storage
    .table<PageDigestRow>("page_digest")
    .where({ page_id: pageId, source_hash: sourceHash })
    .first();
  return row?.digest ?? null;
}

export async function putDigest(pageId: number, sourceHash: string, digest: string) {
  await desktop.storage.execute(
    `INSERT INTO page_digest (page_id, source_hash, digest) VALUES (?, ?, ?)
     ON CONFLICT(page_id) DO UPDATE SET source_hash = excluded.source_hash, digest = excluded.digest, created_at = datetime('now')`,
    [pageId, sourceHash, digest]
  );
}

export async function getFreshDigestPageIds(moduleId: number) {
  const rows = await desktop.storage.query<{ page_id: number }>(
    `SELECT page_digest.page_id FROM page_digest
     JOIN page ON page.id = page_digest.page_id
     WHERE page.module_id = ? AND page_digest.created_at >= page.updated_at`,
    [moduleId]
  );
  return new Set(rows.map((row) => row.page_id));
}

export async function deleteOrphanPreps() {
  await desktop.storage.execute(
    "DELETE FROM module_prep WHERE module_id NOT IN (SELECT id FROM module)"
  );
  await desktop.storage.execute(
    "DELETE FROM page_digest WHERE page_id NOT IN (SELECT id FROM page)"
  );
}
