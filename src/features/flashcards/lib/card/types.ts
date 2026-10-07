import type { FlashcardRow } from "@/shared/lib/db/schema/flashcard";

export type Flashcard = FlashcardRow & { page_title: string | null };

export type CardDraft = { front: string; back: string; page_id: number | null };

export type DeckCounts = { due: number; fresh: number; total: number };
