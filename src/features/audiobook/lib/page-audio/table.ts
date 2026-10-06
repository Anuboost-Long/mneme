import type { PageAudioRow } from "@/shared/lib/db/schema/page-audio";
import { desktop, type SqlFragment } from "@chain/sdk";

import type { AudioSentence, PageAudio } from "./types";

const pageAudioTable = () => desktop.storage.table<PageAudioRow>("page_audio");

export async function getPageAudio(pageId: number): Promise<PageAudio | null> {
  const row = await pageAudioTable().where({ page_id: pageId }).first();
  return row ? { ...row, sentences: JSON.parse(row.sentences) as AudioSentence[] } : null;
}

export function getPageAudios(filter: SqlFragment) {
  return pageAudioTable().where(filter).all();
}

export async function replacePageAudio(row: Omit<PageAudioRow, "created_at">) {
  await desktop.storage.transaction(async (tx) => {
    const table = tx.table<PageAudioRow>("page_audio");
    await table.delete({ page_id: row.page_id });
    await table.insert(row);
  });
}

export async function deletePageAudioRows(filter: SqlFragment) {
  await pageAudioTable().delete(filter);
}
