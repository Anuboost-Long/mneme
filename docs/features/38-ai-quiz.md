# Phase 38 — AI Quiz

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 38.
Builds on flashcards (`37-flashcards.md`, the same agent and material
handling) and the AI actions agent (`21-ai-quick-actions.md`). No
chain-sdk capability needed: quizzes live in the local database.

## Status — 6 October 2026

**Built and run in the dev build.** Module 2 → Quizzes → New quiz, 5
questions from "Summary: Chapter 2": Claude wrote 3 multiple-choice
(right answers shuffled to positions 3, 4 and 1), 1 true/false and 1
short answer, each with an explanation and its page. Taking it: keys
1–4 picked options, Check answer marked them with the explanation and
the page link, focus moved to Next question, the short answer showed the
model answer with I got it / I missed it, and the end said "You got 2 of
5" with each question marked. The Quizzes list then showed "Last 2/5 ·
Best 2/5 · 1 attempt"; Try again restarted without saving the unfinished
run. ⌘P → Make a quiz on a page opened the dialog on that page. The test
quiz was deleted through Delete afterwards. `tests/quizzes.test.mjs`
covers reading the agent's reply, the shuffle, marking, scores, deleting,
hiding with a deleted module and backups.

Added after first use: quizzes are written in the background with a
progress bar and a pop-up when ready (checked in the dev build with a
test job: sweeping bar, then 2 of 5, then the pop-up with Start quiz,
then dismissed).

The flashcard screens' header became `courses/components/ModuleSubpageHeader.tsx`,
shared with the quiz screens.

## Goal

Let the student test themselves on a page or a whole module with a
quiz the agent writes from their own material, see why each answer is
right, and watch their score improve over attempts.

## How it works

- **Quizzes screen** per module (`/courses/:courseId/modules/:moduleId/quizzes`):
  Module → **Quizzes** (next to Flashcards), or ⌘P → **Quizzes**. Lists
  each quiz with what it covers, its number of questions, the last and
  best score and how many attempts.
- **New quiz**: from the whole module or one page; 5, 10, 15 or 20
  questions; any mix of multiple choice, true/false and short answer.
  The AI actions agent writes the questions from the pages' own words
  (at most 60,000 characters of material), as JSON. Questions it gets
  wrong in shape are dropped, and the order of multiple-choice options is
  shuffled so the right one isn't always first. ⌘P → **Make a quiz** on a
  page opens the same dialog on that page.
- **Written in the background.** Make quiz closes the dialog at once;
  the quiz is written while the student keeps working anywhere in the
  app. The jobs tray (bottom right, `app/JobsTray.tsx`, on the shared
  store `shared/lib/backgroundJobs.ts`) shows "Writing a quiz" with a
  progress bar: a sweeping bar until the agent starts writing, then
  "3 of 10 questions" counted from its streamed reply (Codex sends its
  reply in one piece, so its bar jumps), then "saving". When it's done the
  card becomes a pop-up, "Your quiz is ready" with **Start quiz**; a
  failure says why. The Quizzes screen lists quizzes being written with
  the same bar and refreshes when one is ready.
- **Taking a quiz** (`…/quizzes/:quizId`): one question at a time,
  answers hidden. Pick an option (or keys 1–4), or type a short answer,
  then **Check answer**:
  - Multiple choice and true/false are marked straight away: correct or
    not, the right answer, and the explanation, with a link to the page
    it came from.
  - Short answers show the model answer and explanation; the student
    marks themselves **I got it** or **I missed it** (no second agent
    run, so it's instant and costs nothing).
  - **Next question**; at the end, the score, each question marked right
    or wrong, **Try again** and **Back to quizzes**.
- **Score**: every finished attempt is saved with its score and which
  questions were right (for Phase 39's weak areas). Leaving half-way
  saves nothing.
- Quizzes of a module in Recently deleted are hidden; deleted
  permanently, they go at the next start. A quiz whose page is deleted
  keeps its questions without the link. Backups include quizzes,
  questions and attempts. **Delete** a quiz asks first and is permanent.

## Data model

Migration `0039-quizzes`:

- `quiz`: `module_id`, `page_id` (null for a whole-module quiz), `title`.
- `quiz_question`: `quiz_id`, `position`, `kind` (1 multiple choice,
  2 true/false, 3 short answer), `prompt`, `choices` (JSON list, multiple
  choice only), `answer` (the right option's index, `true`/`false`, or the
  model answer), `explanation`, `page_id`.
- `quiz_attempt`: `quiz_id`, `score`, `total`, `answers` (JSON list of
  `{ questionId, correct }`), `created_at`.

## Source locations

- `src/shared/lib/db/schema/quiz.ts`, `quiz-question.ts`, `quiz-attempt.ts`.
- `src/features/quizzes/lib/quiz/`: types, table, actions.
- `src/features/quizzes/lib/generate.ts`: asks the agent for questions.
- `src/features/quizzes/components/NewQuizDialog.tsx`.
- `src/features/quizzes/pages/QuizzesPage.tsx`, `QuizPage.tsx`.

## Acceptance criteria

- [x] New quiz on a module makes a quiz of the chosen size and kinds.
- [x] A page's quiz uses that page only.
- [x] Taking it: answers stay hidden until Check answer; explanations
  show; a short answer is self-marked.
- [x] The finished score shows on the Quizzes screen as last and best.
- [x] Quizzes survive a backup and restore (tests).
