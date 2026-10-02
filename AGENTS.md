# mneme — Agent Memory

mneme consumes the Chain SDK (`@chain/sdk`) from the sibling `chain-sdk`
repo. It must never import Tauri, Rust, or any native/OS API directly —
only `@chain/sdk`. See that repo's `AGENTS.md` and `docs/ARCHITECTURE.md`
for the rules this app has to follow, and
`agent-docs/capabilities/<name>/CONTRACT.md` for what each capability
actually does.

## Current state

This is the scaffold produced by `chain init`:

- Tauri + React + TypeScript (via `create-tauri-app`) — a real native
  runtime, not just a browser page. `npm run dev`/`npm run build` run
  `chain dev`/`chain build`, which wrap the real `tauri dev`/`tauri build`
  behind condensed output — this was deliberately changed from
  `create-tauri-app`'s default, where those names only ran Vite. Use
  `npm run dev:web`/`npm run build:web` for frontend-only iteration. If
  you ever rename `dev:web`/`build:web`, update
  `.chain/native/tauri.conf.json`'s `beforeDevCommand`/`beforeBuildCommand`
  to match, or `npm run dev`/`npm run build` will recurse into
  themselves infinitely.
- The Tauri native project (Rust/Cargo side) lives at `.chain/native/`,
  not the usual `src-tauri/` — dot-prefixed and hidden on purpose, since
  it's generated/framework-owned the same way `node_modules` is, and you
  should almost never need to open it (the real native logic lives in
  `chain-sdk`'s `crates/core`). `chain dev`/`chain build` point Tauri at
  it via the `TAURI_APP_PATH` env var, so running `tauri dev`/`tauri
  build` directly (instead of through `chain`) won't find it.
- Tailwind CSS v4, wired through `@tailwindcss/vite` in `vite.config.ts`.
  `src/App.css` defines the `chain-navy`/`chain-lime`/`chain-cream` theme
  tokens (matched to `asset/app-icon.svg`) via a Tailwind `@theme` block —
  use them as plain classes (`bg-chain-navy`, `text-chain-lime`, ...),
  don't reach for arbitrary-value brackets or a different palette without
  a reason. Add custom CSS there only when a utility class genuinely
  can't express it.
- Routing via `react-router-dom`'s data router, split into a husk/content
  layering (mirrors Lazify's own renderer structure):
  - `src/router.tsx` — `createBrowserRouter` route tree. Add new
    top-level routes here as siblings; nest under a parent route only when
    routes genuinely share layout beyond `RootLayout`.
  - `src/routes/` — one husk per route (`HomeRoute.tsx`, `CourseRoute.tsx`,
    ...). A route component owns the wiring only: `useParams`, data
    fetching, and app-wide state such as `useCourses()`, passed down as
    plain props. It renders nothing but its feature's page component.
  - `src/features/<feature>/pages/` — the actual UI (`HomePage.tsx`,
    `CoursePage.tsx`, ...), receiving data/callbacks as props from its
    route. A feature can own several nested pages (e.g. `courses` spans
    the course list, a single course, a module, and a lesson page).
  - `src/features/<feature>/components/` and `.../lib/` — components and
    data-access functions used only within that feature.
  - `src/shared/ui/`, `src/shared/lib/`, `src/shared/providers/` — pieces
    used across more than one feature (`Typography`, `db/`,
    `ThemeProvider`, ...).
  - `src/shared/lib/api.ts` — the only caller of `desktop.http`. Features
    use `apiGet`/`apiRequest`, which reject with an `ApiError` (readable
    `message`, plus `code` and `status`). App-wide request defaults, such
    as headers, belong there. `tests/conventions.test.mjs` fails if any
    other file calls `desktop.http`.
  - `src/app/` — the app shell's own pieces (`NavBar`, `Sidebar`), used
    only by `src/layouts/RootLayout.tsx`.
  - `src/layouts/RootLayout.tsx` — shared chrome (`NavBar` + `<Outlet/>`).
    It opens the database, loads the course list into its atom, and shows
    the loading/error screen.
  - App-wide state uses Jotai atoms, kept in the owning feature's
    `lib/<feature>State.ts` with a hook in front of them (e.g.
    `features/courses/lib/coursesState.ts` → `useCourses()`). Use an atom
    only for state that more than one screen reads or changes; state that
    belongs to one component stays local, and the database stays the source
    of truth. After changing data behind a screen's back, reload the atom
    (`refresh()`) rather than patching it by hand.
  - `src/App.tsx` just renders `<RouterProvider router={router} />`;
    `src/main.tsx` is untouched from `create-tauri-app`'s default.
    This is standard in-window SPA routing, not Tauri's multi-window API —
    multiple native windows are a different pattern (separate OS-level
    windows, not in-page navigation) and would be a deliberate later choice
    if this app ever needs genuinely separate windows, not a default.
- Local SQLite schema lives in `src/shared/lib/db/`, managed the way
  `dotnet ef` manages a .NET model (chain-sdk's `chain migration` /
  `chain database` commands):
  - `db/schema/<table>.ts` — one `@Table` class per table (decorators
    from `@chain/sdk/schema`: `@PrimaryKey`, `@Column`, `@ForeignKey`,
    `@Index`, `@Trigger`, `@NotMapped`). **This is the source of truth.**
    Each file also exports `<Table>Row` as a type alias — the name the
    rest of the app imports. Literal-union property types (e.g.
    `agent_connection.kind`) are narrowed by hand; they're still TEXT.
  - To change the database: edit the classes, then run
    `chain migration add <name>`. It writes `db/migrations/000N-name.ts`
    (up and `down` SQL, in its own transaction), a `.model.json`
    snapshot, and regenerates `db/migrations/index.ts`. Review the SQL,
    especially any table rebuild or data-loss warning.
  - `chain migration check` fails when the classes have changes no
    migration covers. `chain migration list` shows what's applied
    locally. `chain migration remove` drops the latest migration if it
    hasn't been applied. `chain database update [target]` applies
    pending migrations or reverts to a version. Starting the app
    (`initDb()`) also applies pending ones.
  - Never edit a shipped migration — the runner stores a checksum. Add
    the next one instead.
  - `features/<feature>/lib/*.ts` maps a table's raw `Row` type onto an
    app-facing type (e.g. `bookmarked` 0/1 -> `boolean`, numeric enum
    columns -> their TS enum) and owns that table's queries — see
    `features/courses/lib/courses.ts` for the pattern, and
    `features/courses/lib/completion-status.ts` for why status/type
    columns are numeric enums (smaller storage) rather than TEXT.
  - Typed queries are the default: `desktop.storage.table()` for reads
    and writes, `desktop.storage.transaction()` for multi-step writes
    (`courses.ts` and `modules.ts` show both). When a change touches a
    `lib/*.ts` file that still uses raw `desktop.storage.query`/`execute`,
    move that whole file to `table()` in the same change, not just the
    query you came to edit. Raw SQL stays only where `table()` can't say
    it: joins, aggregates and `GROUP BY`, `LIKE` search, and SQL-computed
    values such as `COALESCE(MAX(position), 0) + 1` (pass those to
    `table()` as a `sql` fragment where it accepts one).
- Chain's placeholder branding: `asset/app-icon.svg` (used in the nav
  bar) and `asset/icons/` (the full desktop icon set), also copied into
  `.chain/native/icons/` where Tauri's bundler actually reads them from
  (`.chain/native/tauri.conf.json`'s `bundle.icon` already points there —
  no config change needed to use them).

## Staying in sync with chain-sdk

Run `chain update` from this app's root any time chain-sdk's templates
change. It does a real three-way merge (like git), not a reset — files
you haven't touched pick up the new template silently; files you've
edited merge cleanly if the changes don't overlap, or get real `<<<<<<< /
======= / >>>>>>>` conflict markers if they do (resolve those before
`npm install` or building). `.chain/baseline/` is the merge ancestor this
depends on — **commit it to git, don't delete or gitignore it**.

## Replacing the icon

1. Replace `asset/app-icon.svg` with your own square SVG.
2. Regenerate the desktop set: `npx tauri icon asset/app-icon.svg --output asset/icons`
   (run from this app's root, after installing the Tauri CLI).
3. Copy the regenerated files from `asset/icons/` into `.chain/native/icons/`
   — that's the copy Tauri's bundler actually uses.

## Next steps

- [ ] Replace `Home`/`About` with real screens — this scaffold's pages
      are placeholders, not a design to keep.
- [ ] Do not add capabilities here speculatively. A capability only gets
      built in `chain-sdk` when this app has a real requirement for it
      (see `chain-sdk/AGENTS.md` rule 7).
- [ ] If this app ever needs genuinely separate OS windows (not just
      in-page routes), that's a Tauri multi-window decision to make
      deliberately — don't reach for it by default.
