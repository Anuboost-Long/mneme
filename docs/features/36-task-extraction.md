# Phase 36 — Automatic Task Extraction

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 36.
Builds on tasks (`35-tasks.md`), smart content detection
(`12-smart-content-detection.md`) and the AI actions agent
(`21-ai-quick-actions.md`). No chain-sdk capability needed.

## Status — 6 October 2026

**Built and run in the dev build.** On Programming Principle › Module 1
(Tasks → Find tasks) the preview offered Discussion 1, 2 and 3, each
from its own page. With Discussion 3 unticked, Add created the other two
in that course and module, linked to their pages; reopening offered
only Discussion 3 with "2 already in your tasks". The test tasks were
deleted afterwards. Ask AI to look too ran against Claude; the first
version offered renamed copies of the discussions ("Industry Challenge
discussion post"), fixed by telling the agent what's listed and dropping
an AI task whose page already is a task of that type. ⌘P → Find tasks
on a module opens the dialog on that module. `tests/find-tasks.test.mjs`
covers candidates, due dates, filtering, the AI reply and adding.

None of your real pages has a due line the detector reads, so due
dates were checked by the tests only.

Running it over every real module also showed noise the import's
detector lets through, now filtered here: a link named only by its
address ("Discussion: https://…"), a bare heading ("EXERCISES"), and a
page's own activity heading repeated as a second task.

## Goal

Phase 35 makes tasks from a page while it's being imported. Pages that
are already in mneme (imported before tasks existed, made by hand,
pasted in) never get looked at. Phase 36 looks through a whole module's
pages, shows what it found, and adds only what the student picks.

## How it works

- **Find tasks** opens from the Tasks screen (beside New task) and from
  ⌘P on a module ("Find tasks"). Choose the course and module; the
  module's pages are read straight away.
- **Candidates** (rules, instant, on the device):
  - A page that is itself work: its type is Assignment, Discussion or
    Exercise (a quiz when the detector reads an Exercise page as one).
    The task is the page's title. The type alone decides, not the
    detector: a lesson that lists "Discussion 1" isn't a discussion.
  - Activities named in a page ("Activity 2.1", "Discussion 3: …",
    "Quiz 1", LMS activity links, an import's Activities checklist).
- **Due dates**: the page's due-date lines (Phase 12). A page task takes
  its page's earliest date; an activity takes the date of a due line that
  names it.
- **Preview**: one row per candidate with a tick box (ticked), its title,
  type, due date and the page it came from. A title already in the
  module's tasks isn't offered again ("N already in your tasks").
- **Ask AI to look too** sends the module's pages (title, headings and
  the start of the text, at most 60,000 characters) to the AI actions
  agent and adds what it finds that the rules missed, marked "Found by
  AI". Nothing is created until the student presses Add.
- **Add N tasks** creates the ticked ones in that course and module,
  each linked to its page (the Tasks screen links back to it).

## Source locations

- `src/features/tasks/lib/findTasks.ts` — candidates, the AI pass, adding.
- `src/features/tasks/components/FindTasksDialog.tsx` — the preview.
- `src/features/tasks/pages/TasksPage.tsx`, `src/features/courses/pages/ModulePage.tsx` — entry points.

## Acceptance criteria

- [x] A module with an Assignment page and a page listing "Discussion 1"
      offers both, with the assignment's due date (tests).
- [x] Unticking one and pressing Add creates only the other, linked to
      its page; opening Find tasks again offers only what's left.
- [x] Ask AI to look too adds candidates marked Found by AI, and says so
      when it finds nothing else.
