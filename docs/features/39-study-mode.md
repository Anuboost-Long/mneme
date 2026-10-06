# Phase 39 — Study Mode

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 39.
Builds on flashcards (`37-flashcards.md`) and AI quizzes
(`38-ai-quiz.md`), and the AI actions agent (`21-ai-quick-actions.md`).
No chain-sdk capability needed: sessions live in the local database.

## Status — 6 October 2026

**Built and run in the dev build.** Module 2 → Study → New study
session: the jobs tray showed "Preparing a study session", then "Your
study session is ready" with Start session. Claude wrote a three-paragraph
overview, 7 topics (13 page links) and 10 questions, all tagged with a
topic. Flashcards: 20 of 24 due cards queued; Good, Again, Good moved
the schedule (1 day, 10 minutes, 1 day) and Skip to the quiz went on.
The quiz scored 4 of 10, saved one attempt on its quiz and the session's
results; Results listed every topic's score and 5 weak topics with pages
to re-read; Study again went back to Summary; the Study screen showed
"Quiz 4/10 · 3 cards · Weak: …". The quiz and flashcard screens were
checked again after the refactor. The test session, its quiz and the card
grades were undone afterwards. `tests/study.test.mjs` covers reading the
agent's reply, topic scoring, saving, deleting, hiding with a deleted
module and backups.

The question step of `QuizPage` became `quizzes/components/QuizRunner.tsx`
and the card step of `FlashcardReviewPage` became
`flashcards/components/CardReview.tsx`, shared with the session.

## Goal

Turn a module's existing material into one guided revision session:
read a summary, review flashcards, take a quiz, then see which topics
are weak and what to review next.

```text
Summary → Flashcards → Quiz → Weak areas → Recommended review
```

## How it works

- **Study screen** per module (`/courses/:courseId/modules/:moduleId/study`):
  Module → **Study**, or ⌘P → **Study this module**. Lists past sessions
  with their date, quiz score, cards reviewed and weak topics.
- **New study session** makes one agent run in the background (jobs
  tray, "Preparing a study session", with a pop-up and **Start session**
  when it's ready). From the module's pages (at most 60,000 characters)
  the agent writes, as JSON:
  - a short overview of the module;
  - 3–7 key topics, each with a one-or-two-sentence summary and the
    pages it comes from;
  - a 10-question quiz (all three kinds), each question tagged with its
    topic. It's saved as a normal quiz, so it also shows on Quizzes;
  - flashcards, only when the module's deck is empty. They're added to
    the deck.
- **A session** (`…/study/:sessionId`) has four steps, shown at the top:
  1. **Summary**: the overview, then each topic with its summary and
     links to its pages.
  2. **Flashcards**: the deck's due cards (at most 20), graded as in
     Study flashcards, so the review schedule moves on. With nothing
     due, the step says so and goes on to the quiz.
  3. **Quiz**: the session's quiz, taken as on the quiz screen; the
     attempt is saved to the quiz too.
  4. **Results**: the quiz score and cards right/wrong, **Weak areas**
     (topics where under 70% of their questions and cards were right,
     worst first) and **Recommended review**: for each weak topic, its
     summary and the pages to re-read. With no weak topics, it says so.
- **Recording results**: finishing the quiz (or See results, when the
  quiz was deleted) saves the session's results
  (each topic's right and total, cards right and wrong, finished time).
  **Study again** runs the steps again and replaces the results.
  Leaving half-way saves only what the flashcards and quiz already save.
- Sessions of a module in Recently deleted are hidden; deleted
  permanently, they go at the next start. If the session's quiz is
  deleted, the session skips the quiz step. Backups include sessions.
  **Delete** a session asks first and is permanent (its quiz stays).

## Data model

Migration `0040-study-sessions`:

- `study_session`: `module_id`, `quiz_id`, `overview`, `topics` (JSON
  `[{ name, summary, pageIds }]`), `results` (JSON
  `[{ topic, right, total }]`, null until finished), `cards_right`,
  `cards_wrong`, `finished_at`, `created_at`.
- `quiz_question.topic`: the topic a session question tests (null for
  ordinary quizzes).

## Source locations

- `src/shared/lib/db/schema/study-session.ts`.
- `src/features/study/lib/session/`: types (topic scoring), table, actions.
- `src/features/study/lib/generate.ts`: asks the agent for the session.
- `src/features/study/lib/studyJobs.ts`: background preparation.
- `src/features/study/pages/StudyPage.tsx`, `StudySessionPage.tsx`.
- `src/features/quizzes/components/QuizRunner.tsx` and
  `src/features/flashcards/components/CardReview.tsx`: the question and
  card steps, shared with the quiz and flashcard screens.

## Acceptance criteria

- [x] Select module: Study opens from the module and ⌘P.
- [x] New study session writes a summary, topics and a quiz.
- [x] The summary step shows the overview and topics with page links.
- [x] The flashcards step reviews due cards and moves their schedule.
- [x] The quiz step saves an attempt on the quiz.
- [x] Results are saved and show on the Study screen.
- [x] Weak topics and the pages to review show after the quiz.
- [x] Sessions survive a backup and restore (tests).
