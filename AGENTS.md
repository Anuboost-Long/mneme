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
    fetching, and the `useCourses()` outlet context, passed down as plain
    props. It renders nothing but its feature's page component.
  - `src/features/<feature>/pages/` — the actual UI (`HomePage.tsx`,
    `CoursePage.tsx`, ...), receiving data/callbacks as props from its
    route. A feature can own several nested pages (e.g. `courses` spans
    the course list, a single course, a module, and a lesson page).
  - `src/features/<feature>/components/` and `.../lib/` — components and
    data-access functions used only within that feature.
  - `src/shared/ui/`, `src/shared/lib/`, `src/shared/providers/` — pieces
    used across more than one feature (`Typography`, `db/`,
    `ThemeProvider`, ...).
  - `src/app/` — the app shell's own pieces (`NavBar`, `Sidebar`), used
    only by `src/layouts/RootLayout.tsx`.
  - `src/layouts/RootLayout.tsx` — shared chrome (`NavBar` + `<Outlet/>`)
    and the `useCourses()` outlet-context hook routes pull course data from.
  - `src/App.tsx` just renders `<RouterProvider router={router} />`;
    `src/main.tsx` is untouched from `create-tauri-app`'s default.
    This is standard in-window SPA routing, not Tauri's multi-window API —
    multiple native windows are a different pattern (separate OS-level
    windows, not in-page navigation) and would be a deliberate later choice
    if this app ever needs genuinely separate windows, not a default.
- Local SQLite schema lives in `src/shared/lib/db/`, modeled the way a
  .NET project separates its migration history from its current model:
  - `db/migrations/000N-name.ts` — one file per version, oldest first,
    each a `{ version, sql }` batch for `desktop.storage.migrate`. Never
    edit a shipped migration in place — add the next one and list it in
    `db/migrations/index.ts`.
  - `db/schema/<table>.ts` — one file per table, each a hand-maintained
    `<Table>Row` interface documenting that table's full current column
    list (with which migration added what) — the one place to see the
    whole database without replaying migration history. Update it
    alongside whichever migration changes that table.
  - `features/<feature>/lib/*.ts` maps a table's raw `Row` type onto an
    app-facing type (e.g. `bookmarked` 0/1 -> `boolean`, numeric enum
    columns -> their TS enum) and owns that table's queries — see
    `features/courses/lib/courses.ts` for the pattern, and
    `features/courses/lib/completion-status.ts` for why status/type
    columns are numeric enums (smaller storage) rather than TEXT.
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
