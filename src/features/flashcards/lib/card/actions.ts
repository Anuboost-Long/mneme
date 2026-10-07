import { dueAfter, Grade, nextSchedule } from "@/features/flashcards/lib/schedule";

import { deleteCardRow, insertCards, recordReview, setCardText } from "./table";
import type { CardDraft, DeckCounts, Flashcard } from "./types";

export { deleteOrphanCards, getDeckCards, getDueCards } from "./table";

function checked(front: string, back: string) {
  const trimmed = { front: front.trim(), back: back.trim() };
  if (!trimmed.front) throw new Error("Write the front of the card: the question or term.");
  if (!trimmed.back) throw new Error("Write the back of the card: the answer.");
  return trimmed;
}

export async function addCards(moduleId: number, cards: CardDraft[]) {
  await insertCards(
    moduleId,
    cards.map((card) => ({ ...card, ...checked(card.front, card.back) }))
  );
}

export async function editCard(id: number, front: string, back: string, pageId: number | null) {
  const trimmed = checked(front, back);
  await setCardText(id, trimmed.front, trimmed.back, pageId);
}

export async function reviewCard(card: Flashcard, grade: Grade, now = new Date()) {
  const schedule = nextSchedule(card, grade);
  await recordReview(
    card.id,
    schedule,
    dueAfter(schedule.interval_days, now),
    grade !== Grade.Again
  );
  return schedule;
}

export async function deleteCard(id: number) {
  await deleteCardRow(id);
}

export function deckCounts(cards: Flashcard[], now = new Date()): DeckCounts {
  const today = now.toISOString().replace("T", " ").slice(0, 19);
  return {
    due: cards.filter((card) => card.due_at <= today).length,
    fresh: cards.filter((card) => card.repetitions === 0 && card.last_reviewed_at === null).length,
    total: cards.length
  };
}
