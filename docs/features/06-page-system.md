# Phase 6 — Page System (Frontend Requirements)

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 6.
Follows Phase 5 (Module Management), already built and verified.

Written before implementation per the roadmap's own "One Feature at a
Time Rule" (define requirement → data model → backend/service → test →
UI → connect → test → commit).

## Goal

Let a user create and manage pages inside a module — the third level of
the Course → Module → Page hierarchy, and the first place learning
material itself (a "lesson", "chapter", or any of the roadmap's other
page types) lives. This also gives modules somewhere to be opened: a
module now gets its own view listing its pages.

## In scope for this increment

- Create a page inside a module with just a title — Notion-style quick
  add, not a multi-field form. Type and content are added afterward, on
  the page itself.
- Page type, one of the roadmap's list: Lesson, Lecture, Exercise,
  Discussion, Assignment, Notes, Reading, Revision, Custom — edited from
  the page view after creation (`PageForm`'s edit mode), not at create
  time.
- Assign the page to its module (`module_id`).
- Open a module (`/courses/:courseId/modules/:moduleId`) to see and
  manage its pages, in creation order.
- Open a page (`/courses/:courseId/modules/:moduleId/pages/:pageId`) to
  read and edit its content in a rich text editor, autosaving.
- **Rich text editor** — pulled forward from Phase 7 ("Basic Editor")
  once page content needed somewhere to actually be written: TipTap,
  as the roadmap itself recommends, covering paragraphs, headings (H2/
  H3), bold, italic, underline, strikethrough, bullet and numbered
  lists, blockquote, inline code, code blocks and links. Content is
  stored as the editor's HTML in the existing `content` column — no
  migration. Slash commands (Phase 8) and non-text blocks — tables,
  images, file/audio embeds, callouts, collapsible sections (Phase 7's
  "Advanced Editor") — stay deferred.
- Rename a page / change its type / edit its content.
- Delete a page, with a confirmation step (destructive action).
- Deleting a module also deletes its pages; deleting a course deletes
  the pages under all of its modules too (extends the cascading-delete
  policy `docs/features/05-module-management.md` established for
  courses → modules).

## Explicitly out of scope for this increment

- **Duplicate a page** — not core CRUD; add when actually requested,
  same reasoning Course Management used for deferred columns.
- **Move a page (between modules) / reorder pages** — Phase 9 is a
  dedicated drag-and-drop phase; doing either properly here would mean
  building part of it early. Pages list in creation order for now.
- **Page icons** — the `page` table has no `icon` column, and unlike
  `module` (whose `status` column shipped with the Phase 3 migration),
  it was never planned into the schema. Add it if a later phase
  actually asks for it.
- **Page covers** — needs file import/storage, which is Phase 14
  (Image Support) — same reasoning Course Management used to defer
  course cover images.
- **Page status** — same reasoning as page icons: no column exists for
  it in the Phase 3 migration, unlike `module.status`. Add it only when
  a phase that needs it (e.g. task tracking) actually asks for it.

## Data model (already exists, no changes needed)

```sql
CREATE TABLE page (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'lesson',
  content TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Type values (per roadmap Phase 6's "Possible page types"): `lesson`,
`lecture`, `exercise`, `discussion`, `assignment`, `notes`, `reading`,
`revision`, `custom`.

## Backend/service layer needed (new)

A small repository module (`src/lib/pages.ts`) wrapping
`desktop.storage.query`/`execute`, matching `src/lib/modules.ts`'s
shape:

- `getPages(moduleId)` — ordered by `created_at, id`.
- `getPage(id)`
- `createPage(moduleId, { title, type?, content? })`
- `updatePage(id, { title?, type?, content? })` — also bumps
  `updated_at`
- `deletePage(id)`

## Backend/service layer changed (existing)

- `deleteModule` (`src/lib/modules.ts`) now deletes the module's pages
  first (`DELETE FROM page WHERE module_id = ?`), then the module
  itself.
- `deleteCourse` (`src/lib/courses.ts`) now deletes the pages under all
  of the course's modules first (`module_id IN (SELECT id FROM module
  WHERE course_id = ?)`), then the modules, then the course.

## UI needed (new)

- **Module page** (`src/pages/Module.tsx`) — mirrors `Course.tsx`'s
  shape: breadcrumb back to the course, module name/description/status,
  Edit/Delete module actions (reusing `ModuleForm`/`DeleteModule`), and
  a page list below with the same empty-state / list-row / "+ New page"
  pattern Module Management introduced for the course page.
- **Page form** (`src/components/PageForm.tsx`) — reuses the shared
  `Dialog`, mirrors `ModuleForm`. Create mode: title only. Edit mode:
  title + type. No content field in either mode — content lives in the
  page's own rich text editor, not a dialog.
- **Page editor** (`src/components/PageEditor.tsx`) — a TipTap instance
  embedded directly in the page view (not a dialog), with a fixed
  formatting toolbar (bold/italic/underline/strike/inline code,
  H2/H3/bullet list/numbered list/blockquote/code block, link) and
  debounced autosave (800ms after the last edit) straight to
  `updatePage`, with a saving/saved/error status line and a retry
  action on failure.
- **Delete page** (`src/components/DeletePage.tsx`) — mirrors
  `DeleteModule`: confirmation prompt, then `deletePage`.
- **Page view** (`src/pages/Page.tsx`) — breadcrumb (course → module →
  page), title, type badge, `PageEditor` for the content, an Edit
  action (opens `PageForm`, title/type only) and a Delete action (with
  confirmation, then navigate back to the module).
- **Course page** (`src/pages/Course.tsx`) — each module row's name
  becomes a link to its module page, so modules are actually openable
  now (the empty state's "Room for what comes next" copy already
  promised this).

## Routes

- `/courses/:courseId/modules/:moduleId` → `Module.tsx`
- `/courses/:courseId/modules/:moduleId/pages/:pageId` → `Page.tsx`

Both are siblings of `courses/:courseId` in `router.tsx` (same layout,
same reasoning `router.tsx`'s own comment gives for course/settings/
about being siblings).

## Manual test plan

- Open a module, create two pages, confirm both appear in creation
  order with their type.
- Open a page, confirm title/type/content render.
- Edit a page's title/type/content, confirm the page and the module's
  list both reflect it.
- Delete a page, confirm it disappears from the module's list and, if
  it was open, navigates back to the module.
- Delete a module that has pages, confirm the pages are gone too
  (query the database directly, since there's no cross-module page
  view yet).
- Delete a course that has modules with pages, confirm those pages are
  gone too.
- Restart the app, confirm all changes persisted.

## Implementation — 15 September 2026

- [x] `src/lib/pages.ts`: repository (`createPage`, `getPages`,
  `getPage`, `updatePage`, `deletePage`) on parameterized Chain SDK
  storage calls, matching `modules.ts`'s shape.
- [x] `deleteModule` now deletes a module's pages before the module
  itself; `deleteCourse` deletes pages under all of a course's modules
  before the modules, then the course.
- [x] `Module.tsx` (module view + page list), `Page.tsx` (page view),
  `PageForm.tsx`, `DeletePage.tsx`. Course page's module rows now link
  to the module view.
- [x] Routes: `/courses/:courseId/modules/:moduleId`,
  `/courses/:courseId/modules/:moduleId/pages/:pageId`.
- [x] SQLite repository lifecycle tests: `node --test tests/pages.test.mjs`
  (create/rename/delete, partial edits, default type, per-module
  scoping, module- and course-deletion cascades).
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [ ] Native app restart/persistence acceptance check for the new UI.
- [ ] Browser interaction checks (blocked this pass — Claude in Chrome
  extension wasn't connected; the dev server was left running on
  `localhost:1420` for manual verification).

### Rich text editor — 15 September 2026 (pulled forward from Phase 7)

- [x] `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit` added
  (`package.json`) — StarterKit v3 already registers underline and
  link, so no extra extension packages were needed.
- [x] `PageForm.tsx` simplified: create = title only; edit = title +
  type. Content field removed from the dialog entirely.
- [x] `PageEditor.tsx`: toolbar + `EditorContent`, debounced (800ms)
  autosave via `updatePage`, saving/saved/error status with retry.
- [x] `pageContentPreview()` (`src/lib/pages.ts`) strips HTML tags for
  the gallery card's plain-text preview, since `content` is now HTML.
- [x] Editor prose styles (`.page-editor-content` in `src/App.css`) for
  headings, lists, blockquote, code/code block, links — light/dark
  aware via the existing `--ink`/`--muted` custom properties.
- [x] Whole-frontend typecheck and production build: `npm run build:web`
  (bundle grew to ~765KB gzipped ~237KB from TipTap; no code-splitting
  applied — not requested, flagging for whenever bundle size matters).
- [ ] Browser interaction checks (same blocker as above — extension not
  connected). No automated test covers the editor itself: ProseMirror
  needs a real DOM, which this project's Node-based component tests
  (`renderToStaticMarkup`) don't provide.
- [x] Backspace/Delete no longer triggers the desktop webview's
  built-in "navigate back" when focus is outside an editable field
  (`src/App.tsx`, a global keydown guard — this is a WKWebView quirk,
  not specific to the editor, so it's app-wide rather than local to
  `PageEditor.tsx`).
- [x] The "Saved" status now clears itself 2 seconds after a save
  completes (`PageEditor.tsx`), instead of staying up indefinitely.

### Slash commands — 15 September 2026 (pulled forward from Phase 8)

- [x] `@tiptap/suggestion` and its `@floating-ui/dom` peer added
  (`package.json`) for the "/" trigger, filtering and floating-menu
  positioning.
- [x] `src/components/blockCommands.ts`: the single source of truth for
  every block-type command — `{ id, label, hint, isActive, run }` per
  command, consumed by both the slash menu and (once the toolbar was
  replaced — see below) the selection context menu, so they can't
  drift apart.
- [x] `SlashMenu.tsx`: the floating command list — mouse and keyboard
  (arrow keys, Enter) selection, filtered by the typed query against
  each command's label. Escape-to-dismiss and outside-click-to-dismiss
  come from `@tiptap/suggestion` itself, not custom code.
- [x] `SlashCommands.ts`: the TipTap extension wiring `Suggestion` to
  `SlashMenu` via `ReactRenderer` (from `@tiptap/react`) and the
  plugin's own `mount()`/managed positioning — picking an item deletes
  the typed `/query` text, then runs that command's `run(editor)`.
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [ ] Browser interaction checks (same blocker — extension not
  connected).
- Command categories and AI commands stay deferred (roadmap Phase 8
  itself marks these separately from the core detect/open/search/
  select/insert loop, and AI doesn't exist yet — Phase 19+).

### Selection context menu and more block types — 16 September 2026

Replaces the fixed toolbar with a Notion-style right-click menu on a text
selection, and expands the block set beyond the original "Basic Editor"
list.

- [x] `src/components/PageEditor.tsx`: the always-visible toolbar row
  and its `Toolbar`/`ToolbarButtons` components are gone. Formatting
  now happens by selecting text and right-clicking it.
- [x] `src/components/markCommands.ts`: the mark commands (bold,
  italic, underline, strikethrough, inline code) that used to live
  inline in the toolbar, extracted the same way `blockCommands.ts`
  already was — one list, `{ id, label, hint, className, isActive,
  run }`, no separate definition per consumer.
- [x] `src/components/SelectionMenu.tsx`: a right-click context menu —
  mark toggles, a "Turn into" block list (from `blockCommands.ts`),
  and Link. Positioned and clamped to the viewport, dismissed on
  outside pointerdown/resize/scroll/Escape, arrow-key navigable —
  mirrors the existing pattern in `CourseActions.tsx` rather than
  inventing a new one (including its exact fix for a TypeScript
  closure-narrowing quirk: guard on `menu.current` directly before
  assigning `const element`, since narrowing from a later `if
  (!element)` doesn't carry into a nested closure).
- [x] `PageEditor.tsx` shows the menu only on right-click over a
  non-empty selection (`!editor.state.selection.empty`); right-click
  with no selection still gets the native OS context menu.
- [x] More block types, all via extensions already published by
  TipTap itself (no native module involved): Heading 1 (StarterKit's
  heading levels already include it, just wasn't exposed before),
  Checklist (`@tiptap/extension-task-list` +
  `@tiptap/extension-task-item`), Table
  (`@tiptap/extension-table`'s `TableKit`, non-resizable for now,
  inserts a 3×3 grid with a header row), Divider (StarterKit's
  horizontal rule, likewise not previously exposed as a command).
  These are also reachable from the slash menu, since it reads the
  same `blockCommands.ts` list.
- [x] Editor prose styles extended in `src/App.css` for `h1`,
  `ul[data-type="taskList"]` (checkbox layout, strike-through when
  checked), `hr`, and `table`/`th`/`td`.
- [x] Whole-frontend typecheck and production build: `npm run build:web`
  (bundle now ~842KB gzipped ~261KB — grew further with the table
  extension; still no code-splitting, same as noted above).
- [ ] Browser interaction checks (same blocker — extension not
  connected). This one especially needs a manual pass: right-click
  menus, table insertion/editing and checkbox toggling are exactly the
  kind of interaction the Node-based tests can't reach.
- Still deferred: toggle/collapsible sections and callouts (need a
  custom TipTap node, not an off-the-shelf extension), page-embed
  conversion, and anything requiring file import (images, audio —
  Phase 13/14, needs the `Files + File Dialogs` native module).

Full progress checklist: [Development roadmap](../AI%20Learning%20Workspace%20%E2%80%94%20Development%20Roadmap.md).

## Gallery presentation

Pages share the module gallery card design, with page type, a three-line
plain-text content preview (HTML stripped via `pageContentPreview()`) and
Open page action. Empty pages leave the preview blank. Hover and keyboard
focus highlight the card; Edit and Delete keep their existing dialogs. The
gallery adapts to available width. Page type selects and text inputs share
a fixed 44px height.

## Page outline navigator — 16 September 2026

A chapter-map-style rail + hover table of contents on the right edge of a
page view, built from that page's own heading structure (an Apple Books/
Kindle-style pattern, not something the roadmap named — added on request).

- [x] `src/components/PageOutline.tsx`: reads `h1`/`h2`/`h3` directly out
  of `editor.view.dom` (the DOM TipTap already manages — no separate ref
  or ProseMirror position bookkeeping needed) whenever the editor
  updates or the window resizes.
- [x] A fixed rail of short bars, one per heading (wider for H1, narrower
  for H2/H3), positioned at the vertical screen center — evenly spaced
  by list order, not by actual scroll-height proportion. The reference
  screenshots suggested a proportional minimap; I simplified to even
  spacing because it doesn't need continuous document-height
  measurement that breaks on resize/reflow, at the cost of not
  reflecting how far apart sections actually are. Flag it if the
  literal scroll-proportional version matters.
- [x] Hovering the rail reveals a panel listing every heading, indented
  by level; clicking a rail tick or a panel entry scrolls smoothly to
  that heading (`scrollIntoView`, instant instead of smooth under
  `prefers-reduced-motion`).
- [x] The whole app scrolls at the document level (`RootLayout.tsx` has
  no inner `overflow-y-auto` pane), so this tracks `window.scroll` /
  `window.scrollY` directly rather than a container ref.
- [x] The current section is tracked via scroll position (the last
  heading whose top has scrolled past a small offset) and highlighted
  on both the rail and the panel.
- [x] Hidden below the `sm` breakpoint, and hidden entirely when a page
  has fewer than two headings (nothing to navigate between).
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [ ] Browser interaction checks (same blocker — extension not
  connected). Scroll-position tracking and hover behavior are exactly
  the kind of thing that needs a live check.

## Selection menu restyled to match Notion's — 16 September 2026

`SelectionMenu.tsx` now mirrors Notion's own selection popup layout on
request (a reference screenshot of it), rather than the flat always-open
list it started as:

- [x] "Turn into" collapses to one row showing the selection's current
  block type + a chevron; clicking expands the full `blockCommands.ts`
  list inline (indented, top border) instead of always taking the
  space.
- [x] Marks moved into a 4-column icon grid below it: Bold/Italic/
  Underline/Clear-formatting, then Strikethrough/Code/Link — same
  order as Notion's row. Link got an actual chain-icon SVG instead of
  the word "Link"; `markCommands.ts` gained a `clearFormatting`
  ("Tx") entry (`unsetAllMarks()`).
- [x] Not carried over from the reference (no backing feature to
  attach them to): text-colour/highlight swatch, equation, Comment,
  and the "Skills"/"Edit with AI" section — those need an AI
  integration that doesn't exist yet (roadmap Phase 19+).
- [x] Menu height is now capped (`max-h-[70vh]`, scrolls) and
  re-clamps to the viewport when "Turn into" expands, since expanding
  it can make the menu taller than when it was first positioned.
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [ ] Browser interaction checks (same blocker — extension not
  connected).

### Fix: arrow-key navigation appeared broken — 16 September 2026

Root cause was one bug, reported as two symptoms: `window.addEventListener
("scroll", onClose, true)` dismissed the menu on *any* scroll, including
the menu's own `overflow-y-auto` list auto-scrolling a newly arrow-key-
focused button into view — so navigating with arrow keys past the visible
area closed the menu instead of moving focus.

- [x] Scroll dismissal now checks the event's target the same way the
  pointerdown dismissal already did — only a scroll whose target is
  outside the menu closes it.
- [x] Arrow-key navigation now matches the actual visual layout instead
  of one flat Up/Down cycle through every button in DOM order:
  Up/Down move through the "Turn into" row and (when expanded) its
  block list; Up/Down in the icon grid jump by row (4 at a time, via a
  `data-grid="true"` marker on grid buttons) and fall through to/from
  the list at the grid's top/bottom edge; Left/Right move within the
  grid row.
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [ ] Browser interaction checks (same blocker — extension not
  connected). This is exactly the kind of interaction bug that
  wouldn't have shipped with a live check available.

### Fix: "Turn into" block list unreachable by keyboard — 16 September 2026

The list only existed in the DOM once expanded, and only a mouse click
expanded it — so pressing ArrowDown from the "Turn into" row skipped
straight past it into the icon grid below. Keyboard-only navigation could
never reach the block-type list at all.

- [x] ArrowDown and ArrowRight on the "Turn into" row now expand it (if
  collapsed) and move focus onto its first item, instead of skipping to
  the grid; ArrowLeft collapses it again. Matches the common disclosure-
  widget convention (Right opens, Left closes) on top of fixing the
  skip.
- [x] `aria-controls` added linking the toggle button to the list it
  expands, for the same reason any accordion/disclosure needs it.
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [ ] Browser interaction checks (same blocker — extension not
  connected).

### "Turn into" rebuilt as a flyout submenu, real root cause of the arrow-key bug fixed — 16 September 2026

Real root cause of "arrow keys don't work": the previous approach moved
real DOM focus between individual `tabIndex={-1}` buttons and relied
entirely on the browser's native `:focus-visible` ring to show which one
was active. That's not reliable in WKWebView (Tauri's macOS webview) for
focus set via a JS `.focus()` call rather than an actual Tab keypress —
focus *was* moving, there was just nothing reliably visible to prove it,
which reads as "the keys don't do anything."

- [x] Rebuilt on a virtual-focus / roving-highlight model instead
  (the standard accessible pattern for composite widgets like this —
  `aria-activedescendant` — rather than a browser-focus-ring
  workaround): real DOM focus stays on the outer `<menu>` the entire
  time; a `activeMain`/`activeBlock` id in React state tracks which
  item is "active," and the highlight is a CSS class driven by that
  state, not by `:focus-visible` at all. This can't silently fail to
  render regardless of platform focus-ring quirks.
- [x] Mouse hover and keyboard navigation now drive the exact same
  highlight state (`onMouseEnter` sets the same id arrow keys set) —
  so "make the arrow keys hover other elements" is literally true:
  they move the same highlight the mouse does.
- [x] "Turn into" (`src/components/TurnIntoSubmenu.tsx`, new) is now a
  separate flyout panel beside the main menu, matching the referenced
  Notion screenshot, instead of expanding inline. Opens on hovering or
  keyboard-activating the "Turn into" row (ArrowRight/Enter), closes
  on ArrowLeft/Escape or the pointer leaving both the row and the
  panel (150ms grace period so moving the mouse from one to the other
  doesn't flicker it shut).
- [x] Each block type gets a small icon (`src/components/blockIcons.tsx`,
  new — text glyphs for Text/H1/H2/H3/Code block matching the existing
  B/I/U/S convention, small SVGs for bulleted/numbered/checklist/quote/
  table/divider) and the currently-applied type gets a checkmark,
  separate from the keyboard/hover highlight — the same two-signal
  design the reference screenshot shows (a checked item and a
  differently-highlighted hovered item aren't the same thing).
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [ ] Browser interaction checks (same blocker — extension not
  connected). Everything about this change is interaction behavior;
  it needs a live check more than anything else in this file has.

### Fix: active item could scroll out of view during arrow-key nav — 16 September 2026

Both `SlashMenu.tsx` and `TurnIntoSubmenu.tsx` scroll (`overflow-y-auto`
with a max-height) but arrow-key navigation only moved which item was
highlighted, never brought it back into the visible area — so navigating
past the fold left the active item scrolled out of sight.

- [x] `SlashMenu.tsx`: scrolls the newly active `<li>` into view
  (`scrollIntoView({ block: "nearest" })`) whenever `selected` changes.
- [x] `TurnIntoSubmenu.tsx`: same fix, scoped to the panel via its own
  ref rather than a bare `document.getElementById`, keyed off
  `activeId`.
- [x] `block: "nearest"` in both cases, so it only scrolls when the
  item is actually out of view, not on every keypress.
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [ ] Browser interaction checks (same blocker — extension not
  connected).

### Images in page content — 16 September 2026 (partially resolves the deferred item in Phase 14/Image Support)

No `Image` node was ever registered in the editor's schema, so TipTap
silently dropped any image content — pasted, dropped, or otherwise. Fixed
without needing the still-deferred `Files + File Dialogs` native module:
the course-icon upload already proved browser File API → data URL works
for images with no native file access at all, so this reuses that exact
approach for page content instead of a native file path.

- [x] `@tiptap/extension-image` added; `src/lib/page-image.ts` —
  `pageImage()` mirrors `course-image.ts`'s validate/decode/resize (same
  format allowlist, same 10MB cap) but caps at 1600px instead of 256px
  (a document image, not an icon), and skips the canvas re-encode
  entirely when no resize is needed, to avoid a lossy round-trip for
  small images and SVGs.
- [x] `pickImage()` (same file): a plain hidden `<input type="file">`
  wrapped in a promise — not a Tauri dialog, matching the pattern
  `CourseForm.tsx`'s picture upload already established.
- [x] "Image" added to `blockCommands.ts` (reachable from both the
  slash menu and "Turn into") — its `run()` stays synchronous per the
  shared command shape, but kicks off `pickImage()` and inserts once
  the promise resolves, same deferred-completion shape as everywhere
  else `blockCommands` already does async-adjacent work.
- [x] Paste and drag-and-drop of image files insert directly
  (`editorProps.handlePaste`/`handleDrop` in `PageEditor.tsx`), using
  the ProseMirror `view` passed into those handlers rather than the
  outer `editor` const, since they're defined inside the same object
  literal that constructs it.
- [x] `.page-editor-content img` styled (`max-width: 100%`, rounded,
  block) in `App.css`.
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [ ] Browser interaction checks (same blocker — extension not
  connected). Paste/drop especially needs a live check; the slash/
  turn-into path exercises the same `pageImage()`/insert code either
  way.
- Still deferred: an actual native file-open dialog (Phase 13/14 proper
  — needs the `Files + File Dialogs` native module), and any image
  editing (crop, alt text UI, resize handles).

### Image hover toolbar and alignment — 16 September 2026

On request (a Notion screenshot of its own image hover toolbar), scoped to
the specific thing asked for — alignment — not the rest of what that
toolbar shows (comment, crop, zoom, download, AI): those need features
that don't exist in this app.

- [x] `AlignableImage.ts`: extends `@tiptap/extension-image` with a
  `data-align` attribute (`left` / `center` / `right`, default
  `center`) instead of using the stock node as-is.
- [x] `ImageOverlay.tsx`: a floating toolbar shown on hovering an
  image (delegated `mouseover`/`mouseout` on `editor.view.dom` in
  `PageEditor.tsx`, not a per-image listener, since images come and
  go as the document changes) — align left/center/right, and remove.
  150ms close delay + the toolbar's own `onMouseEnter` cancelling it
  is what lets the pointer travel from the image to the toolbar
  without it closing mid-move (same hover-bridge pattern
  `TurnIntoSubmenu.tsx` already uses).
- [x] Re-renders and repositions on every `editor.on("update")` while
  hovering, since clicking an alignment button changes the image's
  own on-screen size/position (see below) and the toolbar needs to
  follow it there, not stay pinned to where it opened.
- [x] Center (the default — every image gets `data-align="center"`
  from the moment it's inserted) stays full-width, unchanged from
  before alignment existed. Left/right cap at `max-width: 50%` —
  alignment against a line only reads as alignment if the image
  doesn't already span the whole line.
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [ ] Browser interaction checks (same blocker — extension not
  connected). Hover behavior and reposition-on-align are exactly the
  kind of thing that needs a live check.

### Fix: selecting a node (an image) had no selection styling at all — 16 September 2026

Reported as "the highlight looks messy, focused on the whole line instead
of the image" when clicking an image. Root cause: `prosemirror-view`'s own
base stylesheet was never imported anywhere in this project. That
stylesheet is what defines `.ProseMirror-selectednode` — the class
ProseMirror puts on a selected node (an image, a table) — as a clean
outline scoped tightly to that one element. Without it, a selected image
had no selection styling of its own at all, so whatever the browser fell
back to read as unscoped and messy by comparison.

- [x] `import "prosemirror-view/style/prosemirror.css"` added to
  `PageEditor.tsx`. Also promoted `prosemirror-view` from a transitive
  dependency (via `@tiptap/pm`) to a direct one in `package.json`,
  since the code now imports from it directly.
- [x] `.page-editor-content .ProseMirror-selectednode` overrides the
  stylesheet's default `#8cf` outline color with the app's own `--ink`
  token instead, plus a matching border-radius.
- [x] Whole-frontend typecheck and production build: `npm run build:web`
  (CSS output grew ~43.9KB → 44.8KB, confirming the stylesheet actually
  landed in the bundle).
- [ ] Browser interaction checks (same blocker — extension not
  connected). This one in particular was reported from live use, not
  something I'd have caught without it.

### Fix: edits (images included) could silently disappear — 16 September 2026

Reported as "the image keeps disappearing." Two separate bugs, both real:

1. **`useEditor`'s content never re-syncs.** It defaults to `deps: []`
   (confirmed in `@tiptap/react`'s compiled source), meaning the
   editor instance and its initial content are set up once and never
   revisited — even if the `content`/`pageId` props change on a later
   render. `Page.tsx` rendered `<PageEditor>` with no `key`, and
   because navigating from one page to another matches the same route
   (`courses/:courseId/modules/:moduleId/pages/:pageId`), React Router
   doesn't unmount the component on a param change alone — so the
   *old* page's editor instance stayed alive showing the *old* page's
   content while `pageId` had already moved on. Worse: a pending
   debounced save queued under the old page could fire *after*
   navigating, writing stale content into the *new* page's row.
   Fixed with `key={page.id}` on `<PageEditor>`, forcing a full
   remount — and therefore a fresh, correctly-initialized editor —
   whenever the page actually changes.
2. **The debounced autosave (800ms) was cancelled, not flushed, on
   unmount.** Editing something (pasting an image, typing) and
   navigating away within that window — an extremely normal thing to
   do right after inserting an image — discarded the change entirely;
   nothing was ever written to storage. Fixed: `onUpdate` now also
   stores the latest HTML in a `pendingContent` ref, and the unmount
   cleanup flushes it directly via `updatePage()` (not `save()` — the
   component is already unmounting, so there's no status UI or parent
   state left worth updating) instead of merely cancelling the timer.
   `pendingContent` clears itself once a save actually confirms for
   that exact HTML, so a normal (non-flushed) save doesn't leave a
   stale ref around to redundantly re-save on a later unmount.
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [ ] Browser interaction checks (same blocker — extension not
  connected). Both of these are specifically about cross-page
  navigation and timing, exactly what the automated tests (which only
  exercise the repository layer) can't reach.

### Explicit back button, on request ("some users don't know about a breadcrumb") — 16 September 2026

- [x] `Module.tsx` and `Page.tsx` now each have a "Back to X" button
  above their breadcrumb, matching the pattern `Course.tsx` already
  used (back arrow icon, bordered button) — the breadcrumb stays too,
  this adds to it rather than replacing it. Module's back button goes
  to its course; page's goes to its module.
- [x] Whole-frontend typecheck and production build: `npm run build:web`.

### Outline rail fades in on scroll, on request — 16 September 2026

- [x] `PageOutline.tsx`'s rail is now visible briefly when a page first
  loads (so it's discoverable at all), fades to hidden after 1.2s of
  no scroll activity, and reappears on scrolling or hovering it
  directly — still hoverable while faded, since opacity alone doesn't
  affect pointer events, so finding it blind at the screen edge still
  works. Reuses `<main id="main-content">`'s scroll listener the
  active-heading tracking already had, rather than adding a second one.
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [ ] Browser interaction checks (same blocker — extension not
  connected). The fade timing/feel in particular needs eyes on it.

### Fix: pending edits still lost on reload/close, not just navigation — 16 September 2026

The earlier "edits disappearing" fix only flushed a pending debounced save
on React component unmount, which covers in-app navigation. It does
nothing for a hard reload, closing the tab, or quitting the app — all
extremely plausible right after pasting an image, to check whether it
actually saved — since none of those unmount React at all; the pending
save (and the edit itself) just vanishes with no trace.

- [x] `flushPendingSave()` extracted (was inlined in the unmount
  cleanup) and now also runs on `visibilitychange` (fires as soon as
  the tab/window is hidden or backgrounded — well before a reload,
  close, or app quit actually completes, giving the flush a real
  window to finish) and `pagehide` (best-effort second attempt for
  the same moment).
- [x] On failure, the flushed content is put back into `pendingContent`
  rather than dropped, so a later flush attempt (another hide event,
  or eventual unmount) gets another chance at it instead of silently
  giving up after one failed write.
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [ ] Browser interaction checks (same blocker — extension not
  connected). Like the earlier navigation fix, this is entirely about
  timing around tab/window lifecycle events that no automated test in
  this project can reach.

### Verification: the database layer itself was never the problem — 16 September 2026

Requested explicitly ("make sure it's saved to app memory") after several
rounds of timing fixes based on code review alone, with no live browser
available to actually watch it happen.

- [x] `tests/pages.test.mjs`: new test saves a page with a ~400KB
  base64 image embedded (realistic size for a resized photo, not a
  token string) via `updatePage`, then discards everything in memory
  and re-fetches via `getPage` — the same read path `PageEditor.tsx`
  uses on mount — asserting the image data comes back byte-for-byte.
  Passes: SQLite reliably round-trips a large embedded image with no
  truncation. This rules out the database as the cause of anything
  reported in this session; the actual bugs (documented above) were
  always about the frontend not calling the save function at the
  right moments, never about storage failing once called.
- [ ] Still not verified: the live UI behavior (paste → wait → reload
  → still there) end to end. The extension remained disconnected;
  this automated test is the strongest verification available without
  it, but it isn't a substitute for actually watching it happen.

### Fix: quitting the app specifically could still lose a pending save — 16 September 2026

Reported again after the previous round of fixes: pasting an image, then
closing and reopening the *app* (not just navigating in-app), still lost
it sometimes. Root cause: `visibilitychange`/`pagehide` fire reliably, but
neither *guarantees* the async save they kick off actually finishes
before Tauri tears down the webview on a real window close — there's a
real gap between "the event fired" and "the IPC write to SQLite landed."

- [x] `flushPendingSave()` is now `async` (was fire-and-forget), so it
  can actually be awaited where that matters.
- [x] `PageEditor.tsx` now intercepts the Tauri window close request
  (`getCurrentWindow().onCloseRequested`) when there's a pending save:
  prevents the default close, awaits the flush, then closes the
  window itself once the write has actually landed — the one case
  that can be made to *wait*, unlike a browser tab's unload events.
  Guarded by `isTauri()` (the same check `chain-sdk`'s own
  `storage.ts` uses) so it's a no-op in a plain browser tab, where
  this API doesn't exist at all.
- [x] Whole-frontend typecheck and production build: `npm run build:web`.
- [ ] Browser interaction checks (same blocker — extension not
  connected). This one specifically requires the native app (this
  code path is inert in the web dev preview by design), so it's
  doubly out of reach without either the extension or your own hands
  on the built app.

### Manual save (Cmd/Ctrl+S), on request — 16 September 2026

- [x] `PageEditor.tsx`: Cmd/Ctrl+S cancels the pending debounce and
  saves the current editor content immediately, through the same
  `save()` path (and status feedback) the debounced autosave uses —
  not a separate mechanism.
- [x] Whole-frontend typecheck and production build: `npm run build:web`.

### Root cause found: images silently dropped on reload — `allowBase64` — 16 September 2026

The actual primary cause of "the image keeps disappearing," found and
reproduced with a real Playwright + Chrome harness
(`.local-checks/repro-selection.mjs`, gitignored scratch script mirroring
`.local-checks/browser.mjs`'s pattern) after the timing fixes above turned
out not to be the whole story. Seeded a page with an `<img src="data:...">`
directly in the database (bypassing the editor, i.e. simulating a reload),
loaded it, and inspected the DOM: `document.querySelectorAll('img')`
returned nothing, and the image node was silently absent from
`editor.getHTML()`'s parsed output.

Root cause: `@tiptap/extension-image`'s `parseHTML()` rule is
`img[src]:not([src^="data:"])` unless the extension is configured with
`allowBase64: true` — it defaults to `false`. Every image in this app is
a `data:` URL (there's no file storage, by design — see the image-support
entry above), so *every single one* was excluded when TipTap re-parsed
saved HTML back into the editor on mount. This explains why it always
looked fine in the live session — inserting an image goes straight
through `view.state.schema.nodes.image.create({src})` (direct node
creation, no HTML parsing involved) — but vanished specifically after a
reload, which is the one path that round-trips through `parseHTML()`.
This also fully explains why the database round-trip test above passed:
storage was never the problem, only the editor's own re-parse of what
storage correctly returned.

- [x] `PageEditor.tsx`: `AlignableImage.configure({ allowBase64: true })`.
- [x] Verified live in the Playwright harness: reloading the seeded page
  now shows `complete: true, naturalWidth: 300, naturalHeight: 200` for
  the image, and `data-align` survives the round-trip.
- [x] `npm run build:web` and `node --test tests/*.test.mjs` (15/15
  passing).

### Fix: lime selection "expanding to a full block/row" was `::selection` painting solid — 16 September 2026

The Chrome/Playwright repro of clicking/dragging over an image (logged
below as "does not reproduce") turned out to be testing the wrong
thing — an actual screen recording of the desktop app made the real
mechanism obvious: dragging a selection through an image, or into the
paragraphs after it, paints the *entire* image and everything below it
as solid opaque lime rectangles, not a translucent highlight.

Root cause: `App.css`'s global `::selection` rule set
`background: var(--color-chain-lime)` with no transparency. WebKit
(and Chromium) paint `::selection` as filled rectangles over every
selected line box, and over replaced elements like `<img>` that fall
inside the selection range, it fills their *entire* box solid — there
is no way to get a "highlight" look from an opaque `::selection`
background once an image or multiple lines are involved, regardless of
ProseMirror's own NodeSelection/decoration logic. This was never a
node-selection or CSS-scoping bug (the earlier `.ProseMirror-selectednode`
import fix was real and correct, but unrelated to this specific report).

- [x] `App.css`: `::selection` background changed to
  `color-mix(in srgb, var(--color-chain-lime) 55%, transparent)` —
  keeps the on-brand lime color but as a translucent tint instead of a
  solid fill.
- [x] Verified in the Playwright harness
  (`.local-checks/repro-selection.mjs`): dragging from a list item,
  through an embedded image, into two trailing paragraphs now shows
  the image tinted (its own contents still visible underneath) and the
  text as a normal translucent highlight — not solid blocks.
- [x] `npm run build:web`.

<details><summary>Superseded: does-not-reproduce note from earlier in the same session</summary>

Investigated the report that clicking an image, or clicking text near
one, expands the lime selection highlight to a full block/row. Extended
the same Playwright harness to load a page shaped like the real
"Full Learning Material" page (heading, paragraph, bullet list, image,
trailing paragraph) and screenshot: initial load, after clicking the
image, after clicking plain text, and after a drag-select spanning from
the list into the trailing paragraph. None of those three showed the
bug — the drag-select screenshot only spanned two short lines of plain
text, never a range solid enough (an image, or several block-level
paragraphs) to expose the opaque-`::selection` behavior found above.
Two screen recordings from the actual app, requested afterward,
reproduced it immediately once the drag crossed an image.

</details>
