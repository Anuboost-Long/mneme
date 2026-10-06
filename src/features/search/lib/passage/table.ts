import type { PagePassageRow } from "@/shared/lib/db/schema/page-passage";
import { desktop } from "@chain/sdk";

import type { PageToIndex, Passage, SearchablePassage } from "./types";

function encodeVector(vector: Float32Array) {
  const bytes = new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeVector(text: string) {
  const bytes = Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
  return new Float32Array(bytes.buffer);
}

export function getPagesToIndex(model: string) {
  return desktop.storage.query<PageToIndex>(
    `SELECT page.id, page.title, page.content, page.updated_at FROM page
     WHERE page.deleted_at IS NULL AND NOT EXISTS (
       SELECT 1 FROM page_passage
       WHERE page_passage.page_id = page.id AND page_passage.model = ? AND page_passage.source_updated_at = page.updated_at
     )
     ORDER BY page.updated_at DESC`,
    [model]
  );
}

export async function getPagePassages(pageId: number, model: string): Promise<Passage[]> {
  const rows = await desktop.storage
    .table<PagePassageRow>("page_passage")
    .where({ page_id: pageId, model })
    .orderBy("position")
    .all();
  return rows.map(({ position, text, vector }) => ({
    position,
    text,
    vector: decodeVector(vector)
  }));
}

export function replacePagePassages(
  pageId: number,
  model: string,
  sourceUpdatedAt: string,
  passages: Passage[]
) {
  return desktop.storage.transaction(async (tx) => {
    const table = tx.table<PagePassageRow>("page_passage");
    await table.delete({ page_id: pageId });
    for (const { position, text, vector } of passages)
      await table.insert({
        page_id: pageId,
        position,
        text,
        vector: encodeVector(vector),
        model,
        source_updated_at: sourceUpdatedAt
      });
  });
}

export async function deleteStalePassages(model: string) {
  await desktop.storage.execute(
    "DELETE FROM page_passage WHERE model != ? OR page_id NOT IN (SELECT id FROM page)",
    [model]
  );
}

export async function getSearchablePassages(model: string): Promise<SearchablePassage[]> {
  const rows = await desktop.storage.query<Omit<SearchablePassage, "vector"> & { vector: string }>(
    `SELECT page_passage.page_id, page.title AS page_title, page.module_id, module.course_id,
       page_passage.text, page_passage.vector
     FROM page_passage
     JOIN page ON page.id = page_passage.page_id
     JOIN module ON module.id = page.module_id
     WHERE page_passage.model = ? AND page.deleted_at IS NULL AND module.deleted_at IS NULL`,
    [model]
  );
  return rows.map((row) => ({ ...row, vector: decodeVector(row.vector) }));
}

export async function getLivePageIds() {
  const rows = await desktop.storage.query<{ id: number }>(
    `SELECT page.id FROM page JOIN module ON module.id = page.module_id
     WHERE page.deleted_at IS NULL AND module.deleted_at IS NULL`
  );
  return new Set(rows.map(({ id }) => id));
}

export async function countIndexedPages(model: string) {
  const [row] = await desktop.storage.query<{ pages: number }>(
    "SELECT count(DISTINCT page_id) AS pages FROM page_passage WHERE model = ?",
    [model]
  );
  return row?.pages ?? 0;
}
