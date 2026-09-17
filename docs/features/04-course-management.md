# Phase 4 — Course Management (Frontend Requirements)

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 4.
Follows Phase 3 (Local Database), already built and verified.

Written before implementation per the roadmap's own "One Feature at a
Time Rule" (define requirement → data model → backend/service → test →
UI → connect → test → commit).

## Goal

Let a user create, see, open, edit, and delete courses — the top level
of the Course → Module → Page hierarchy everything else builds on.

## In scope for this increment

- Create a course: name, description, icon, color — exactly the columns
  already in the `course` table (`src/lib/db.ts`), nothing new to
  migrate.
- List courses in a left sidebar (doesn't exist yet — mneme currently
  only has the top `NavBar`; this is the first thing to live in it).
- Open a course (its own route/page).
- Edit a course's name/description/icon/color.
- Delete a course, with a confirmation step (destructive action).

## Explicitly out of scope for this increment

- **Cover image** — needs file import/storage, which is Phase 14
  (Image Support). Add the `cover` column then, not now.
- **Reorder courses (drag and drop)** — Phase 9 is a dedicated
  drag-and-drop phase; doing it properly here would mean building
  half of it early. Courses list in creation order for now.
- **Favourite/pinned courses** — needs a schema column that doesn't
  exist yet; add it with this feature when it's actually requested.
- **Semester / university / instructor / course code** — the roadmap
  itself marks these "Later" under Phase 4, not part of the initial
  pass.
- Modules and Pages (Phases 5–6) — a course needs to open to *something*,
  so this increment's course page will show a placeholder empty state,
  not real module/page content yet.

## Data model (already exists, no changes needed)

```sql
CREATE TABLE course (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## Backend/service layer needed (new)

A small repository module (e.g. `src/lib/courses.ts`) wrapping
`desktop.storage.query`/`execute` — no ORM, per chain-sdk's storage
contract:

- `createCourse({ name, description?, icon?, color? })`
- `getCourses()` — ordered by `created_at` for now (see Reorder, above)
- `getCourse(id)`
- `updateCourse(id, { name?, description?, icon?, color? })` — also
  bumps `updated_at`
- `deleteCourse(id)`

## UI needed (new)

- **Sidebar** (`src/components/Sidebar.tsx`) — left column in
  `RootLayout`, minimal: "Courses" heading, "+ New Course" action, the
  course list. No collapse/AI-panel/theme-toggle polish yet — that's
  the rest of Phase 2, not this feature.
- **Create Course** — a form (name required; description/icon/color
  optional) that calls `createCourse` and refreshes the sidebar list.
- **Course sidebar item** — icon + name, links to the course route,
  highlights when active.
- **Course page** (`src/pages/Course.tsx`) — shows name/description,
  an Edit action, a Delete action (with confirmation), and an empty
  state placeholder where modules will go (Phase 5).
- **Edit Course** — reuses the create form, pre-filled, calls
  `updateCourse`.
- **Delete Course** — confirmation prompt, then `deleteCourse` and
  navigate back to `/`.

## Routes

- `/courses/:courseId` → `Course.tsx`, added as a sibling of
  `home`/`about` in `router.tsx`.

## Manual test plan

- Create two courses, confirm both appear in the sidebar in creation
  order.
- Open a course, confirm its data renders.
- Edit a course, confirm the sidebar label updates.
- Delete a course, confirm it disappears from the sidebar and the app
  navigates away from its (now invalid) route if it was open.
- Restart the app, confirm all changes persisted (same check as
  Phase 3, applied to real UI actions this time instead of direct SQL).

## Implementation — 15 September 2026

- [x] All courses screen: course collection and first-course empty state.
- [x] Sidebar with active course and creation-order list.
- [x] Shared create/edit dialog with name, description, icon and colour.
- [x] Course route with details and a modules placeholder.
- [x] Confirmed deletion and navigation back home.
- [x] Repository using parameterized Chain SDK storage calls.
- [x] Database initialization completes before courses load; visible retry on failure.
- [x] SQLite repository lifecycle test: `node --test tests/courses.test.mjs`.
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [x] Browser interaction checks using a test SQLite adapter: create two courses,
  creation order, open, edit, failed save/retry, reload, cancel deletion, delete,
  missing course, narrow layout, Escape dismissal, startup failure/retry.
- [ ] Native app restart/persistence acceptance check for the new UI.

No lint script or lint configuration exists in the project; lint was not available.
Browser checks do not verify the native Chain bridge. The test adapter lives only
in the ignored `.local-checks` directory; production always uses `@chain/sdk`.

### Visual direction

Course customisation supports outlined preset swatches, a native HTML colour
picker and numeric red/green/blue controls (0–255). Custom icons accept emoji
or symbols. Picture upload accepts PNG, JPEG, WebP, GIF and SVG up to 10 MB;
the browser decodes and resizes these to a static PNG thumbnail with a maximum
dimension of 256 pixels, preserving aspect ratio and transparency. The existing
`icon` column stores its data URL through Chain storage, so no migration or
external file path is needed. Selecting a built-in icon or removing the picture
replaces it. Full course cover images remain outside this increment.

Browser checks with the SQLite test adapter cover RGB changes, swatch borders,
custom symbols, invalid uploads, SVG resizing, narrow layout and save/reload/
edit/removal. Native file-picker interaction remains a manual acceptance check.

The course collection lives at `/courses`; `/` is the separate home screen. The reading surface is
white, with a faint Chain cream sidebar, navy typography and a small lime brand
accent. Course colours identify subjects. Avenir Next (with local system
fallbacks) keeps the interface compact and readable without a font download.
Course rows share dividers; the form uses a single dialog surface.

### Data flow

Course rows in Courses and Sidebar share `CourseActions`: right-click, Shift+F10,
the context-menu key or the visible ellipsis button opens a themed menu with
Open, Edit and Delete. The menu stays within the viewport, supports arrow keys,
Home/End and first-letter navigation, and closes on Escape, Tab, outside clicks,
scroll or resize. Text fields retain their standard context menus.

Menu edits reuse `CourseForm`; both menu and course-page deletion reuse
`DeleteCourse`, including confirmation and failure/retry handling. Deleting the
currently open course navigates to All courses; deleting another course leaves the
current route intact. Browser checks use the SQLite test adapter to verify
menu actions, keyboard focus, placement, light/dark appearance, preserved input
context menus and deletion failure/retry. Native webview acceptance remains
a manual check.

`RootLayout` initializes the existing schema, loads courses, and owns the shared
list. The repository returns the saved SQLite row using its numeric ID. Create
and edit update that list only after storage succeeds; deletion removes the row
from the list only after storage succeeds, then returns to All courses. Routes compare
their string parameter with the string form of the same database ID. Reads use
`created_at, id` to preserve creation order when timestamps tie.

The existing schema is unchanged. Deletion currently removes only the course;
when modules are implemented, define and test the child-data deletion policy
before adding that content.

Full progress checklist: [Development roadmap](../AI%20Learning%20Workspace%20%E2%80%94%20Development%20Roadmap.md).
