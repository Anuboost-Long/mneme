# Phase 5 — Module Management (Frontend Requirements)

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 5.
Follows Phase 4 (Course Management), already built and verified.

Written before implementation per the roadmap's own "One Feature at a
Time Rule" (define requirement → data model → backend/service → test →
UI → connect → test → commit).

## Goal

Let a user create and manage modules inside a course — the second level
of the Course → Module → Page hierarchy. This replaces the "Modules"
placeholder empty state on the course page with a real list.

## In scope for this increment

- Create a module inside a course: name, description, status — exactly
  the columns already in the `module` table (`src/lib/db.ts`), nothing
  new to migrate.
- Assign the module to its course (`course_id`).
- List modules on the course page, in creation order.
- Rename a module / edit its description and status.
- Delete a module, with a confirmation step (destructive action).
- Deleting a course also deletes its modules — the child-deletion
  policy `docs/features/04-course-management.md` deferred.

## Explicitly out of scope for this increment

- **Reorder modules (drag and drop)** — Phase 9 is a dedicated
  drag-and-drop phase, same reasoning Course Management used to defer
  course reordering. Modules list in creation order for now.
- **Collapse/expand** — modules have no visible child content until
  Pages (Phase 6) exist, so there is nothing to collapse yet.
- **Module icons** — the roadmap lists this as a Phase 5 item, but the
  `module` table has no `icon` column; Course Management's own rule
  applies ("add a schema column when it's actually requested"), and
  courses already carry the identifying icon for everything under them.
- **Opening a module as its own page/route** — no content lives inside
  a module until Pages (Phase 6) exist. Modules are managed inline on
  the course page for this increment.

## Data model (already exists, no changes needed)

```sql
CREATE TABLE module (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Status values (per roadmap Phase 5): `not_started`, `in_progress`,
`completed`, `revision_needed`.

## Backend/service layer needed (new)

A small repository module (`src/lib/modules.ts`) wrapping
`desktop.storage.query`/`execute`, matching `src/lib/courses.ts`'s
shape:

- `getModules(courseId)` — ordered by `created_at, id`.
- `getModule(id)`
- `createModule(courseId, { name, description?, status? })`
- `updateModule(id, { name?, description?, status? })` — also bumps
  `updated_at`
- `deleteModule(id)`

## Backend/service layer changed (existing)

- `deleteCourse` (`src/lib/courses.ts`) now deletes the course's
  modules first (`DELETE FROM module WHERE course_id = ?`), then the
  course itself, resolving the deferred child-deletion policy.

## UI needed (new)

- **Module list** — replaces the empty state in `src/pages/Course.tsx`:
  a row per module (name, description, status), an "Edit" and "Delete"
  action per row, and a "+ New module" action. Empty state (unchanged
  copy/illustration) still shows when a course has zero modules.
- **Module form** (`src/components/ModuleForm.tsx`) — reuses the shared
  `Dialog`, mirrors `CourseForm`: name (required), description
  (optional), status (select). Used for both create and edit.
- **Delete module** (`src/components/DeleteModule.tsx`) — mirrors
  `DeleteCourse`: confirmation prompt, then `deleteModule`.

## Manual test plan

- Open a course, create two modules, confirm both appear in creation
  order with their status.
- Edit a module's name/description/status, confirm the list updates.
- Delete a module, confirm it disappears from the list.
- Delete a course that has modules, confirm the modules are gone too
  (query the database directly, since there's no cross-course module
  view yet).
- Restart the app, confirm all changes persisted.

## Implementation — 15 September 2026

- [x] `src/lib/modules.ts`: repository (`createModule`, `getModules`,
  `getModule`, `updateModule`, `deleteModule`) on parameterized Chain
  SDK storage calls, matching `courses.ts`'s shape.
- [x] `deleteCourse` now deletes a course's modules before the course
  itself, resolving the deferred child-deletion policy.
- [x] Course page module list, create/edit dialog (`ModuleForm.tsx`),
  delete confirmation (`DeleteModule.tsx`).
- [x] SQLite repository lifecycle tests: `node --test tests/modules.test.mjs`
  (create/rename/delete, partial edits, default status, per-course
  scoping, course-deletion cascade).
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [ ] Native app restart/persistence acceptance check for the new UI.
- [ ] Browser interaction checks (blocked this pass — Claude in Chrome
  extension wasn't connected; the dev server was left running on
  `localhost:1420` for manual verification).

Modules were superseded as an openable surface by
[Page system](06-page-system.md) in the same pass — opening a module
now shows its pages rather than staying a placeholder.

Full progress checklist: [Development roadmap](../AI%20Learning%20Workspace%20%E2%80%94%20Development%20Roadmap.md).

## Gallery presentation

Modules use the shared `GalleryCard` in a responsive one-, two- or three-column
gallery based on available content width. Cards show the course colour, module
status, description and Open module action. Hover and keyboard focus highlight
the card and opening arrow; Edit and Delete remain accessible on touch screens.
Status selects and text inputs share a fixed 44px height.
