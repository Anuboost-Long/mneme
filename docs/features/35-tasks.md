# Phase 35 — Tasks and Exercises

## Status — 6 October 2026

Shipped. No AI and no new Chain capability: tasks live in the local
database (migration 0038), and imported activities are found by the
import's existing detection (Phase 12). Due dates use mneme's own
calendar (`shared/ui/date/`), ported from Lazify's, instead of the
browser's date input.

## Goal

One list of the work a student has to do — exercises, discussions,
assignments, quizzes and their own to-dos — with due dates, so nothing
in a module is missed.

## How it works

- **A task** has a title, a type (Exercise, Discussion, Assignment,
  Quiz or Personal), an optional course and module, an optional due
  date, and whether it's done. A task made from an import also keeps the
  page it came from.
- **Tasks screen** (`/tasks`, sidebar → Tasks, ⌘P → Tasks): open tasks
  grouped as Overdue, Today, This week, Later and No due date, then Done.
  Filter by course. Tick a task to mark it done (and untick to reopen).
  **New task**, **Edit** and **Delete** (asks first; permanent).
- **From imports**: when a page is imported, each ticked activity becomes
  a task in that module, typed by its name (Assignment, Quiz, Discussion,
  otherwise Exercise). If the page itself is an assignment, quiz,
  discussion or exercise, it becomes a task too, due on the earliest
  ticked due date. A task already in the module with the same title isn't
  added twice.
- **Due dates** are picked from a calendar that opens under the field:
  Monday-first weeks, today outlined, the chosen day filled; the title
  switches to months and then years; arrow keys move a day or a week,
  Page Up/Down a month, Escape closes; **Today** and **Clear date**.
- **Home**: a **Tasks** widget lists the next open tasks, overdue first,
  with a tick box; it can be limited to one course.
- A module's or course's tasks hide while it's in Recently deleted and go
  when it's deleted permanently. A task whose page is deleted keeps going
  without the link. Backups include tasks.

## Source locations

- `src/shared/lib/db/schema/task.ts` — the `task` table (migration 0038).
- `src/features/tasks/lib/task/` — types, table, actions.
- `src/features/tasks/lib/fromImport.ts` — tasks from an import.
- `src/features/tasks/pages/TasksPage.tsx`, `components/TaskForm.tsx`.
- `src/features/home/widgets/tasks.tsx` — the Home widget.
- `src/shared/ui/date/` — `DateField`, `Calendar`, `calendarGrid`.
- Guide topic `tasks`.

## Acceptance criteria

- [x] New task with a due date yesterday shows under Overdue; ticking it
  moves it to Done.
- [x] Importing a page with ticked activities adds them as tasks in that
  module; importing it again adds none.
- [x] The Tasks widget on Home shows open tasks and can tick them off.
- [x] Tasks survive a backup and restore and go with their module.
