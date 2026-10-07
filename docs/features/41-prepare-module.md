# Phase 41 — Prepare Module

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 41 (steps
and research written 6 October 2026). Builds on the agent the AI actions
use (`21-ai-quick-actions.md`), OCR (`15-ocr.md`), transcription
(`17-speech-to-text.md`), Find tasks (`36-task-extraction.md`),
flashcards (`37-flashcards.md`), quizzes (`38-ai-quiz.md`) and Study Mode
(`39-study-mode.md`). No new chain-sdk capability.

## Status — 6 October 2026

**Built and run in the dev build** on Module 4 (5 pages, Claude). The
choices said "About 4 agent runs": reading took 43 s (text in 5 pictures
on one page was read on the Mac), three long pages were condensed, then
one run wrote 7 topics, the summary, revision notes and a 10-question
quiz with every question tagged by topic: 4½ minutes in all. The Summary
and Revision notes pages went to the top of the module, and Listen
appeared on the module (it has no description). Preparing the summary
again said "About 1 agent run", skipped condensing (the digests were
reused) and updated the same Summary page. Stop during reading ended
with "Stopped preparing Module 4 · Nothing was made". Review and add
opened Find tasks with the module's assignment. Also checked: an
attached PDF's text and a recording without a transcript (transcribed
on the Mac, word for word) reach the material, and a Study session on a
prepared module used exactly its topics. Every test change was undone
afterwards (the generated pages are in Recently deleted); the three
condensed pages are kept, so preparing Module 4 now takes one run.
`tests/prepare.test.mjs` covers reading the agent's reply, condensing,
the pages' HTML, agent-run estimates, saving and replacing, digests,
deleted modules and backups.

The jobs tray gained **Stop** for jobs that can stop
(`shared/lib/backgroundJobs.ts`, `app/JobsTray.tsx`).

## Goal

One click turns a module's material into everything a student needs to
revise it: a summary, revision notes, flashcards and a practice quiz,
with the module's exercises, discussions and tasks laid out beside its
original material.

## How it works

- **Prepare screen** per module (`/courses/:courseId/modules/:moduleId/prepare`):
  Module → **Prepare module**, or ⌘P → **Prepare module**.
- **Choose what to make**, each saying what already exists:
  - **Summary**: a Summary page at the top of the module (replaces the
    last one).
  - **Revision notes**: a Revision page with each topic's key terms,
    definitions and key points, and the pages they come from.
  - **Flashcards** for the pages that have none yet.
  - **Practice quiz**: 10 questions tagged by topic (replaces the last
    practice quiz).
  - The screen says about how many agent runs it takes: one for the
    summary, notes and quiz together, one per page that needs
    flashcards, and one per long page when the material is too long to
    send at once.
- **Reading the material, once**, on the device: each page's text, the
  text in its pictures, the text of attached PDF, Word, Markdown and text
  files, and its recordings' transcripts. A recording with no transcript
  is transcribed first. What couldn't be read is listed with why. The
  Summary and Revision notes pages themselves are left out.
- **Too long?** Past 60,000 characters, the longest pages are condensed
  one at a time into notes that keep every fact, term and number. A
  condensed page is kept and reused until the page changes.
- **One agent run** then writes the module's 3–7 key topics (each with
  its pages), the summary, the revision notes and, when chosen, the quiz.
  Topics are saved on the module: the quiz's questions are tagged with
  them, and new Study sessions use the same topics.
- **In the background.** The jobs tray shows "Preparing Module 2" with
  each step ("Reading the material · page 3 of 7", "Writing the summary
  and notes", "Making flashcards · page 2 of 4") and **Stop**. Each
  output is saved as soon as it's made; Stop keeps them. When it's done:
  "Module 2 is prepared" with **Open**.
- **The prepared module**, below the choices: Original material (its
  pages by type), Exercises, Discussions, Summary, Revision notes,
  Flashcards (cards and how many are due, with Study), Practice quiz
  (with its best score), and Tasks: the ones Find tasks spots that aren't
  in Tasks yet, with **Review and add**. Plus anything that couldn't be
  read.
- **Listen** on the module reads the summary when there is one.
- Deleting the module hides its preparation; deleted permanently, it
  goes at the next start. Backups include it.

## Data model

Migration `0041-module-prep`:

- `module_prep`: `module_id` (one per module), `topics` (JSON
  `[{ name, summary, pageIds }]`), `summary_page_id`, `notes_page_id`,
  `quiz_id`, `unread` (JSON list of what couldn't be read), `prepared_at`.
- `page_digest`: `page_id`, `source_hash`, `digest`: a long page's
  condensed notes, kept while the page's material is unchanged.

## Source locations

- `src/shared/lib/db/schema/module-prep.ts`, `page-digest.ts`.
- `src/features/prepare/lib/prep/`: types, table, actions.
- `src/features/prepare/lib/material.ts`: reading the module's material.
- `src/features/prepare/lib/generate.ts`: condensing and the agent run.
- `src/features/prepare/lib/prepareJob.ts`: the background steps.
- `src/features/prepare/pages/PreparePage.tsx`.

## Acceptance criteria

- [x] Prepare module opens from the module and ⌘P, and says how many agent runs it takes.
- [x] The material includes attached PDF and Word text, picture text and transcripts; what can't be read is listed.
- [x] Long material is condensed page by page, and the condensed pages are reused.
- [x] Topics are saved on the module and used by the quiz and Study Mode.
- [x] Tasks not yet in Tasks are listed with Review and add.
- [x] The Summary page sits at the top of the module, and Listen reads it.
- [x] The Revision notes page has each topic's terms, definitions and points.
- [x] Flashcards are made only for pages without any.
- [x] The practice quiz has 10 questions tagged by topic.
- [x] It runs in the background with Stop, saving each output as it's made.
- [x] The prepared module shows every part with links.
- [x] Preparations survive a backup and restore (tests).
