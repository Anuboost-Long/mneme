# Phase 34 — Dashboard widgets

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 34
(Dashboard). The roadmap asked for a home screen with recent pages,
recent and pinned courses, incomplete modules and quick AI actions. Home
is now a customizable widget board, like an iPhone home screen. mneme
ships a catalog of ready-made widgets; the user picks which to show,
arranges and resizes them, and configures or builds their own.

This document is the reference for the widget system: the data model,
how a widget is defined, the grid and sizing rules, edit mode, and how
to add a widget kind. Read it before extending Home.

## Status — 30 September 2026

**Implemented and verified in the running app.** The following were
exercised through `chain inspect`:

- first-run seeding (once, including under React's double-run effects)
- every catalog widget rendered at every size it supports, with real
  data and no runtime errors
- edit mode: wiggle, content made inert
- drag-to-reorder by keyboard, drag-to-resize by pointer and keyboard
- remove plus Undo
- the add gallery
- widget settings: rename, filters
- persistence across a reload
- a quick AI action starting on the opened page

No chain-sdk change was needed.

## What the user sees

- **Header:** date, greeting, **New course**, **Beautify**, **Edit Home**.
  In edit mode it shows **Beautify**, **Add widget** and **Done**.
- **Grid of widgets.** Each widget is a bordered card: a quiet title bar
  (`text-xs`, muted) over its content. There are no shadows except on
  the card being dragged.
- **Edit mode** (Edit Home). Every card:
  - wiggles slightly. The animation is offset per card and is off under
    `prefers-reduced-motion`.
  - locks its content (`inert`), so a click can't open a page while you
    arrange things.
  - shows:
    - a drag grip (reorder)
    - a settings button
    - a round **−** at the top-left (remove)
    - a corner handle at the bottom-right (resize)
- **Remove** is immediate and offers **Undo** for 8 seconds. Undo puts
  the widget back with the same id, config and position.
- **Add widget** opens the gallery:
  - Left: the catalog grouped by category.
  - Right: the selected widget's description, a **live preview** drawn at
    the real size with the user's real data, and a size choice.
- **Settings** (per widget):
  - **Title**, which renames any widget. Leave it empty for the default
    title.
  - Then the widget's own fields: course, page type, status, order,
    period, which AI actions, or links to pages and courses.
  - Size is not a setting; it's changed by dragging.
- **No courses yet:** Home shows a single "Start your first course"
  panel. With courses but every widget removed, it shows "Your Home is
  empty" with **Add widget**.

## Beautify: designed layouts

**Beautify** (in the header, and in edit mode) swaps Home for one of five
designed layouts, chosen at random but never the one just applied. It
replaces every widget. The notice offers **Undo**, which restores the
exact previous layout, including notes, links and settings, through
`replaceWidgets` with the old kinds, sizes and configs. The new cards
settle in one after another: a 260ms fade and rise, staggered 35ms per
card, skipped under reduced motion.

The presets are `layoutPresets` in `widgets/catalog.tsx`:

| Preset   | Idea                   | Widgets in order                                                                                                                                                        |
| -------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focus    | Get back into studying | Recent pages L, Continue M, Streak S, Finished S, Activity M, Quick actions M, Modules W, Status S, Library S                                                           |
| Progress | See how far you are    | Course progress L, Activity W (30 days), Status S, Finished S, Streak S, Library S, Modules M, Recent courses M, Page types M                                           |
| Minimal  | Just the essentials    | Continue M, Streak S, Finished S, Quick actions M, Recent pages W, Recent courses M                                                                                     |
| Review   | Revise before an exam  | Needs revision L, Highlights M, Streak S, Status S, Recordings M, Quick actions M, Recent pages W, Continue M                                                           |
| Planner  | Plan the week          | Note L ("This week" with a goals list), Continue M, Streak S, Finished S, Page count S (in progress), Page count S (not started), Activity M, Recent pages W, Modules M |

**Designing a preset.** A preset must tile the 6-column grid exactly;
all five were measured at 100% filled.

- The order is the placement order. A Large goes first and takes
  columns 1–2 of two rows; the following cards fill row 1 and then row 2
  beside it; the rest start row 3.
- Add up each row to 6 columns (S = 1, M = 2, W = 4, L = 2 wide for two
  rows).
- On 4 or 2 columns, `grid-flow-row-dense` keeps it tidy, but only 6
  columns is exact.
- A preset entry is `[kind, size, config?]`. The config is merged over
  the widget's `defaultConfig`, which is how Planner's two Page counts
  get their titles and filters.

## Sizing: pull and shrink

Sizes are cells on the grid, like iOS widget sizes:

| Size   | Columns × rows | Notes                                  |
| ------ | -------------- | -------------------------------------- |
| small  | 1 × 1          |                                        |
| medium | 2 × 1          |                                        |
| wide   | 4 × 1          | 2 × 1 when the grid has only 2 columns |
| large  | 2 × 2          |                                        |

- **The grid** (`HomePage`):
  - `grid-cols-2 @2xl:grid-cols-4 @5xl:grid-cols-6`
  - `auto-rows-40` (160px), `gap-4`
  - `grid-flow-row-dense`, so small widgets fill gaps
  - Column counts follow the Home container's width (Tailwind container
    queries on `@container`), not the window's. Opening the sidebar can
    change the column count.
- **Resizing** is a drag on the corner handle (`WidgetFrame`):
  1. On pointer down it records the card's box.
  2. On each move it reads the grid's live metrics (column count, cell
     width, row height, gap) from computed style.
  3. It converts the pointer delta into a column × row span and snaps to
     the nearest size that widget supports (`nearestSize`; rows weigh
     double).
  4. The size updates live as it snaps. The grid reflows while you drag,
     like iOS.
- **Keyboard:** on the handle, Right/Down grow and Left/Up shrink, one
  supported size at a time.
- **Resizes animate; nothing jumps.** `HomePage.resizeWidget` measures
  every card (`getBoundingClientRect`) just before the size changes. A
  layout effect keyed on the widgets' sizes then animates each card from
  that box to its new one over 280ms, easing
  `cubic-bezier(0.2, 0, 0, 1)`:
  - The resized card animates its width and height, so its content
    reflows rather than stretching.
  - Neighbours translate out of its way, or into the space it freed.
  - Measuring mid-animation boxes keeps a live drag, which snaps several
    times, continuous.
  - It cancels `useDragReorder`'s own slide for that render, so a card
    never runs two animations.
  - Changes under half a pixel are ignored.
  - With reduced motion there is no animation.
- **Each kind lists `sizes`** it can render well; the handle only snaps
  to those. For example, Continue is small or medium, and Pages finished
  is small only (so it has no handle).

## Data model

Two tables, added in migration 24 (`home-widgets`):

- `home_widget`, one row per widget on Home:
  - `id`
  - `kind`: a key into the catalog
  - `size`: `small|medium|wide|large`
  - `position`
  - `config`: a JSON object
  - `created_at`

  An unknown `kind` (say, from a newer build) is skipped when rendering,
  never deleted.

- `study_day`, counts per local day, for the streak and activity
  widgets:
  - `day` (`YYYY-MM-DD`, local time)
  - `opened`
  - `completed`

  It stores counts only, with no page id, so hard-deleting pages leaves
  nothing to clean up here. History starts from when this shipped.

Also used:

- `page.opened_at` (migration 23) is set by `markPageOpened` whenever a
  page route loads. It deliberately doesn't touch `updated_at`, because
  reading isn't editing. "Recent" everywhere means
  `COALESCE(opened_at, updated_at)`.
- `settings['home.widgets-seeded']` marks that the default layout was
  written. A user who empties Home keeps an empty Home.

### Where study activity is recorded

`src/shared/lib/study-day/` has `recordStudy("opened" | "completed")`,
an upsert on today's row. It's best effort and never throws.

- `markPageOpened` records `opened`.
- `updatePage` records `completed` only when a page's status changes to
  Completed from something else, so re-saving a finished page doesn't
  count twice.

It lives in `shared/lib` because the courses feature writes it and Home
reads it.

### Seeding

`getWidgets(defaults)` in `features/home/lib/widget/`:

1. Claims `home.widgets-seeded` with one
   `INSERT … ON CONFLICT DO NOTHING`, and seeds only if that insert
   affected a row.
2. Shares one in-flight promise between concurrent callers.

React runs effects twice in development. Without step 2, the second
load read a half-seeded table; without step 1, the defaults were written
twice. Both happened in testing. The default layout is `defaultWidgets`
in the catalog.

## Code map

```
src/features/home/
  lib/
    widgets.ts        home_widget CRUD, seeding, reorder, restore (Undo)
    dashboard.ts      every query a widget reads (pages with filters,
                      module progress, status/type counts, study days,
                      streak, library counts, recordings, highlights,
                      agent usage, pages by id)
    useWidgetData.ts  load-on-mount hook, reloaded when its key changes
  widgets/
    types.ts          WidgetDefinition, WidgetField, WidgetProps, categories
    catalog.tsx       the catalog, default layout, widgetTitle, newWidget
    parts.tsx         shared pieces: Rows, RowLink, Stat, ProgressLine,
                      PageGlyph, WidgetNote, rowsFor, pageLink, tint
    study.tsx         Continue, page lists, RecordingsList, Highlights
    Recorder.tsx      Recorder (record, then file on a page)
    progress.tsx      Streak, Activity, Pages finished, Page status,
                      Modules, Course progress, Page count
    Bookshelf.tsx     Library, drawn as a bookshelf
    courses.tsx       Pinned, Recent courses, Page types,
                      Quick AI actions, Agent usage
    tools.tsx         Note, Quick links
  components/
    WidgetFrame.tsx   card chrome and edit-mode controls: drag, resize,
                      settings, remove
    WidgetGallery.tsx Add widget dialog with live preview
    WidgetSettings.tsx settings dialog; renders fields generically
    FileRecordingDialog.tsx files a Home recording on a page, optionally transcribed
  pages/HomePage.tsx  header, grid, edit mode, Undo
src/routes/HomeRoute.tsx  loads and saves widgets; hands HomePage plain callbacks
src/shared/lib/study-day/  localDay, recordStudy
```

It follows the app's husk/content layering. `HomeRoute` owns
persistence: it applies changes optimistically, then writes them.
`HomePage` owns UI state: editing, gallery, settings target, Undo
notice. Each widget loads its own data, so a widget only costs what it
shows, and a new one needs no change to the route.

## Defining a widget

A catalog entry is a `WidgetDefinition` (`widgets/types.ts`):

```ts
{
  kind: "activity",                 // stored in home_widget.kind; never rename
  name: "Activity",                 // gallery name and default title
  description: "Pages opened or finished per day.",
  category: "Progress",             // Study | Progress | Courses | AI | Your own
  sizes: ["medium", "wide", "large"],
  defaultSize: "medium",
  defaultConfig: { days: 14, metric: "opened" },
  fields: [                          // settings dialog, besides Title
    { key: "metric", label: "Show", type: "select", options: [...] },
    { key: "days", label: "Period", type: "select", options: [...] }
  ],
  title: (config, courses) => "...", // optional: title that depends on config
  render: (props) => <ActivityWidget {...props} />
}
```

A component gets `WidgetProps`:

- `widget` (`id`, `kind`, `size`, `config`)
- `courses`
- `editing`
- `onConfig(config)`, which saves a new config. The Note widget uses it
  to save as you type.

Rules that keep widgets consistent:

- **Load with `useWidgetData(load, key)`.** The key must change whenever
  an input changes, such as the config filter or the row limit. Return
  `null` while loading. With no data, say what fills the widget in a
  `WidgetNote` ("Recordings you make on pages show up here."). Never
  show a blank card.
- **Fit the cell; don't scroll inside it.**
  - The frame is `overflow-hidden` with a 36px title bar. `rowsFor(size)`
    gives how many 36px rows fit: 3, or 8 for large.
  - Lists fetch exactly that many.
  - Stats use `Stat`, which is bottom-aligned with a big number, like iOS
    widgets.
- **Adapt to size explicitly.** Branch on `widget.size` for what to drop
  on small (secondary captions, bars). Use container queries (`@md:`) for
  width-dependent details inside a card; the frame is an `@container`.
- **Links go through `RowLink`/`pageLink`.** Edit mode makes content
  inert, so widgets don't need their own edit-mode guards.
- **Config values come from JSON**, so read them defensively
  (`Number(config.courseId) || undefined`, type checks on strings and
  arrays). A missing key means the default.
- **Reuse one component when only the filter differs.** Recent pages,
  Needs revision and Page list are all `PageListWidget`. A preset is just
  `defaultConfig` (`{ status: RevisionNeeded }`).

### Settings fields

`WidgetSettings` renders `fields` generically, so a new widget usually
needs no settings UI of its own:

| `type`    | Control                                                    | Stored as          |
| --------- | ---------------------------------------------------------- | ------------------ |
| `course`  | Select: All courses + each course (`required` drops "All") | course id, 0 = all |
| `select`  | Select from `options`                                      | the option's value |
| `text`    | Text input                                                 | string             |
| `actions` | Checklist of AI actions; none ticked = all                 | `number[]`         |
| `links`   | Search pages and courses, add and remove                   | `{ kind, id }[]`   |

Add a field type in `WidgetField` and `FieldControl` when a second widget
needs it.

### Adding a widget kind, step by step

1. If it needs new data, add a query to `lib/dashboard/`. Keep SQL
   there and out of components.
2. Write the component in the matching `widgets/<category>.tsx`, using
   `parts.tsx`.
3. Add its definition to `widgetCatalog`. Pick `sizes` you've actually
   checked at each size.
4. Optionally, add it to `defaultWidgets`. This only affects fresh
   installs, because existing users are already seeded.
5. Verify: open **Add widget**, select it, and step through each size in
   the preview. Then add it, resize it, change its settings and reload.

## The catalog (21 widgets)

| Category | Widget                                                                                                                                                                         | Sizes   | Settings                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ----------------------------- |
| Study    | Continue — last opened page                                                                                                                                                    | S M     | —                             |
| Study    | Recent pages                                                                                                                                                                   | M W L   | course                        |
| Study    | Needs revision                                                                                                                                                                 | S M W L | course                        |
| Study    | Recorder — record from Home, then save to a page, optionally transcribed; Large also lists recent recordings                                                                   | S M W L | —                             |
| Study    | Highlights                                                                                                                                                                     | M W L   | —                             |
| Progress | Study streak — current and best, last 7 days as dots                                                                                                                           | S M     | —                             |
| Progress | Activity — bars per day                                                                                                                                                        | M W L   | opened/finished, 7/14/30 days |
| Progress | Pages finished                                                                                                                                                                 | S       | week/month/year               |
| Progress | Page status — stacked bar and legend                                                                                                                                           | S M     | course                        |
| Progress | Modules in progress (or all modules of one course)                                                                                                                             | M W L   | course                        |
| Progress | Course progress — %, pages done, modules in Large                                                                                                                              | S M L   | course (required)             |
| Courses  | Pinned courses                                                                                                                                                                 | S M L   | —                             |
| Courses  | Recent courses                                                                                                                                                                 | S M L   | —                             |
| Courses  | Library — a bookshelf: each course a spine in its colour, thicker and taller with more pages, filled from the bottom as pages get done; the last book leans; totals underneath | S M W L | —                             |
| Courses  | Page types                                                                                                                                                                     | M L     | course                        |
| AI       | Quick AI actions — run on the last opened page                                                                                                                                 | S M L   | which actions                 |
| AI       | Agent usage — runs, tokens, cost                                                                                                                                               | S M     | 7/30/365 days                 |
| Your own | Page list — course, type, status, order                                                                                                                                        | S M W L | all four                      |
| Your own | Page count — same filters, own label                                                                                                                                           | S M     | filters, "counted as"         |
| Your own | Note — saved as you type                                                                                                                                                       | S M W L | —                             |
| Your own | Quick links — chosen pages and courses                                                                                                                                         | S M L   | links                         |

Default layout: Continue (M), Study streak (S), Pages finished (S), Quick
AI actions (M), Recent pages (W), Activity (M), Modules in progress (M),
Recent courses (M), Page status (S), Library (S). That's three rows on a
six-column grid.

### Recorder: recording from Home

The `recordings` kind is the Recorder (`widgets/Recorder.tsx`). It used
to be a list, so old Recordings widgets became recorders automatically.

- **Recording** uses the same `useAudioRecorder` as the page's recording
  block: record, pause, resume, stop, a live timer, and a waveform on
  Medium and up. Denied microphone access opens the same
  `MicrophoneAccessDialog`.
- **Stopping opens `FileRecordingDialog`.** It offers a name, then
  **Existing page** or **New page**:
  - **Existing page:** a picker of recently opened pages, or search by
    title and content. It defaults to the page opened last.
  - **New page:** choose a module (it defaults to the module of the page
    opened last) and a title (it defaults to the recording's name). A
    Lecture page is created there. If saving then fails before the
    recording is stored, that new page is deleted again, so nothing
    empty is left behind.

  Then it offers:
  - **Save to page:** `createRecording(page)`, then
    `appendToPage(page, <div data-recording-id>)`. The page gets a
    normal recording block at the end, playable, renameable and
    transcribable there.
  - **Transcribe into page:** the same, then `transcribeRecording`. Each
    transcript line is appended as a paragraph after the block.

- **The audio is saved before transcription runs,** so a failed or
  silent transcription loses nothing. The dialog says which case
  happened and links to the page.
- **"Not now"** keeps the take in the widget ("0:42 recorded · Not saved
  to a page yet") with **Save…** and **Discard**. The unsaved take lives
  in `lib/pendingTake.ts`, outside the widget. It survives leaving Home
  and coming back, and the widget remounting, until it's saved,
  discarded, or the app quits. An earlier version kept it in widget
  state, and a user's take was lost on remount.
- **Known gap:** leaving Home _while_ recording still stops and drops
  that recording, because the recorder lives in the widget. Keeping it
  alive across routes means moving `useAudioRecorder` to an app-level
  provider.
- **The page picker** in the dialog is a list, not radios: the title,
  then course · module on a second line, with a check on the chosen row.
  The radio inputs are still there for keyboard and screen readers, just
  hidden visually. "Not now" is a quiet button on the left; the two save
  actions sit on the right.
- **`transcribeRecording`** (`features/courses/lib/transcription.ts`)
  picks the engine and language the user last chose in a page's
  transcript panel, or the first ones available. It follows the same
  "only downloaded models" setting. The transcript panel and Home share
  this module (keys, locale choice, error messages, engine options), so
  both follow the same rules.
- **`appendToPage(id, html)`** (`pages.ts`) is the general way to add
  content to a page from outside the editor.

### Quick AI actions: how the run starts

The widget navigates to the last opened page with
`state: { runActionId }`. That page's `AiActions` component:

1. reads the route state
2. clears it with `navigate(".", { replace: true, state: null })`, so
   Back doesn't run it again
3. finds the action and connection, and calls the same `start()` as the
   AI menu

Any future "run X on page Y" entry point can use the same route state.

## Design decisions

- **One quiet card style.** 1px `ink/10` border and `rounded-lg`. No
  per-widget colour or shadow.
- **Boldness is spent once:** the lime Continue button. Charts use
  `ink/60` bars. Status colours are the app tokens (`success`, `info`,
  `warning`, `ink/15`), shown only where they encode status.
- **Full width.** Home has no max width; the grid and container queries
  use the space. On very wide windows the extra room becomes more
  columns, not wider rows.
- **Content locks in edit mode** (`inert`), rather than each widget
  checking an `editing` prop.
- **Removing doesn't ask for confirmation;** it offers Undo instead. It's
  cheaper, and it's how iOS does it.

## Known limits and next steps

- **History starts now.** `study_day` has no backfill, so streak and
  activity start at 0 on the day this shipped.
- **One dashboard.** For several boards (per course, or "Exam week"),
  add a `board` column to `home_widget` and a board switcher. Widgets
  and their config are already independent of Home.
- **No widget-to-widget links.** For example, choosing a course in one
  widget doesn't filter the others. A board-level filter would live in
  `HomePage` and be passed through `WidgetProps`.
- **Small screens.** Under the `@2xl` container width the grid is two
  columns. Drag-reorder works by touch through `useDragReorder`, but the
  resize handle is small (24px) on touch screens.
- **Size semantics are per kind.** A kind that renders poorly at a size
  shouldn't list it; there's no generic fallback.
