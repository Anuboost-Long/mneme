import type { Schedule } from "@/features/flashcards/lib/schedule";
import type { FlashcardRow } from "@/shared/lib/db/schema/flashcard";
import { desktop, sql } from "@chain/sdk";

import type { CardDraft, Flashcard } from "./types";

const cardTable = () => desktop.storage.table<FlashcardRow>("flashcard");

const LIVE_CARDS = `FROM flashcard
  JOIN module ON module.id = flashcard.module_id AND module.deleted_at IS NULL
  LEFT JOIN page ON page.id = flashcard.page_id
  WHERE flashcard.module_id = ? AND (flashcard.page_id IS NULL OR page.deleted_at IS NULL)`;

export function getDeckCards(moduleId: number) {
  return desktop.storage.query<Flashcard>(
    `SELECT flashcard.*, page.title AS page_title ${LIVE_CARDS} ORDER BY flashcard.created_at, flashcard.id`,
    [moduleId]
  );
}

export function getDueCards(moduleId: number) {
  return desktop.storage.query<Flashcard>(
    `SELECT flashcard.*, page.title AS page_title ${LIVE_CARDS} AND flashcard.due_at <= datetime('now')
     ORDER BY flashcard.repetitions = 0, flashcard.due_at, flashcard.id`,
    [moduleId]
  );
}

export function insertCards(moduleId: number, cards: CardDraft[]) {
  return desktop.storage.transaction(async (tx) => {
    const table = tx.table<FlashcardRow>("flashcard");
    for (const { front, back, page_id } of cards)
      await table.insert({ module_id: moduleId, page_id, front, back });
  });
}

export async function setCardText(id: number, front: string, back: string, pageId: number | null) {
  await cardTable().update(id, { front, back, page_id: pageId, updated_at: sql`datetime('now')` });
}

export async function recordReview(id: number, schedule: Schedule, dueAt: string, right: boolean) {
  await desktop.storage.execute(
    `UPDATE flashcard SET ease = ?, interval_days = ?, repetitions = ?, due_at = ?,
       right_count = right_count + ?, wrong_count = wrong_count + ?, last_reviewed_at = datetime('now')
     WHERE id = ?`,
    [
      schedule.ease,
      schedule.interval_days,
      schedule.repetitions,
      dueAt,
      right ? 1 : 0,
      right ? 0 : 1,
      id
    ]
  );
}

export async function deleteCardRow(id: number) {
  await cardTable().delete({ id });
}

export async function deleteOrphanCards() {
  await desktop.storage.execute(
    `DELETE FROM flashcard WHERE module_id NOT IN (SELECT id FROM module)
       OR (page_id IS NOT NULL AND page_id NOT IN (SELECT id FROM page))`
  );
}
