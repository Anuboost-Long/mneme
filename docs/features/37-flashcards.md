# Phase 37 — Flashcards

## Status — 6 October 2026

Shipped. No new Chain capability: cards live in the local database
(migration 0037) and are written by the agent the AI actions use
(`runOnce`).

## Goal

Turn course material into flashcards and review them at the right
moments, so the student remembers it for the assessment, without having
to highlight or write cards by hand.

## How it works

- **Decks.** Each module has a deck: its cards, each with a front, a
  back, and the page it came from (if any). Module → **Flashcards**
  (next to Highlights), or ⌘P → **Flashcards** / **Study flashcards**,
  opens it at `/courses/:courseId/modules/:moduleId/flashcards`.
- **Cards are made automatically.**
  - A page imported from an LMS link or file gets cards in the
    background, one agent run per page. **Make flashcards for pages you
    import** on the deck turns this off (setting
    `flashcards.make-for-imports`, on by default).
  - **Make flashcards** on the deck goes through every page that has no
    cards yet, one page at a time, with a progress bar. Pages with
    80 characters of text or fewer are skipped. Cards are saved straight
    into the deck, with no review step; one run per module at a time,
    and it keeps going while the student moves around the app.
  - The agent writes 8–15 cards per page from the page's own words,
    as JSON. Cards without a front or back are dropped.
- **The deck screen** shows how many cards are due, new and in total;
  **Study N cards** when any are due; **Add card**; and the cards with
  their source page, when they're next due, and how often each was
  right and wrong. Cards can be edited and deleted (deleting asks first
  and is permanent).
- **Making cards by hand**: front and back, both required, plus an
  optional source page.
- **Studying** (`…/flashcards/review`): the due cards one at a time,
  reviewed cards first, front first. **Show answer** (Space), then
  **Again**, **Hard**, **Good** or **Easy** (keys 1–4), each showing
  when the card comes back. Again counts as wrong and puts the card at
  the end of this session; the rest count as right. The session ends
  with how many were right and wrong.
- **Spaced repetition** (SM-2, as Anki's default): a new card answered
  Good comes back in 1 day, then 3 days, then the last gap times its
  ease (starting at 2.5). Again resets it to 10 minutes and lowers the
  ease. Hard on a new card brings it back in 12 hours; later, it grows
  the gap by 1.2. Both lower the ease a little. Easy grows it 30% more
  than Good and raises the ease. Ease never drops below 1.3.
- Cards of a module or page in Recently deleted are hidden. When it's
  deleted permanently, its cards are removed at the next start. Backups
  include cards.

## Source locations

- `src/features/flashcards/lib/card/`: the `flashcard` table
  (migration 0037).
- `src/features/flashcards/lib/schedule.ts`: the review schedule.
- `src/features/flashcards/lib/generate.ts`: asks the agent for cards.
- `src/features/flashcards/lib/autoFlashcards.ts`: page-by-page
  making, its progress, and the import switch.
- `src/features/flashcards/pages/`: the deck and study screens.
- `src/features/courses/components/LmsImportForm.tsx`: imports call
  `makeFlashcardsForImport`.
- `src/features/courses/lib/backup/`: backups include `flashcards`.
- Guide topic `flashcards`.

## Acceptance criteria

- [x] Add a card by hand; it's due straight away and shows in Study.
- [x] Make flashcards on a module; cards appear page by page while
      progress shows, each linked to its page.
- [x] An imported page gets cards without any action.
- [x] Study: Space shows the answer, 1–4 grade it. Again brings a card
      back in 10 minutes, Good in 1 day, then 3 days. Right and wrong
      counts go up.
- [x] Cards survive a backup and restore, and go when their module is
      deleted permanently.
