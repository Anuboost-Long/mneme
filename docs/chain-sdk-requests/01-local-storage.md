# Capability Request 1 — Local Storage (Database)

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 3 ("Local
Database") and Recommended MVP item 3.

One phase at a time — this covers only the first feature. Later roadmap
phases (Course/Module/Page management, editor, AI, etc.) each depend on
this one and will be relayed separately once we reach them.

## Why this is the first feature, not Phase 1/2

- Phase 1 (Electron/desktop shell) — already satisfied by mneme's
  existing Tauri scaffold and the verified `platform` capability.
- Phase 2 (sidebar/theme layout) — pure UI. Panel-open state and
  light/dark preference can use the webview's own `localStorage`
  directly; no Chain capability needed.
- Phase 3 (local database) — the first real gap. mneme's own rule is to
  never touch a native filesystem/OS API directly, only `@chain/sdk`
  (see mneme `AGENTS.md`). Every later phase (Courses, Modules, Pages,
  Attachments, AI Actions, Settings tables) depends on this existing
  first.

## What mneme needs

A capability (name TBD by chain-sdk, e.g. `desktop.storage`) for
persistent, structured local storage:

- Open/initialize a database in the app's per-user data directory.
- Run schema migrations.
- Execute parametrized queries and get typed rows back (exact
  read/write shape is a chain-sdk contract decision, not assumed here —
  rule 2, no platform-naming leaks).

mneme's own Course/Module/Page/Attachment/AIAction/Settings schema is
app-level logic on top of this and is not part of the capability itself.

## Native module survey — macOS vs Windows

Unlike Clipboard/Audio-style capabilities, there is no separate OS
"database" service to bridge to — SQLite is a portable C library, so
the same Rust implementation covers both platforms. What differs:

### Shared (identical on both platforms)
- Rust crate: `rusqlite` (or `sqlx` + sqlite driver) built with the
  **bundled** SQLite C source — statically compiled in, no system
  SQLite dependency on either OS.
- App-data directory resolution via Tauri's existing
  `app_handle.path().app_data_dir()` — already cross-platform, nothing
  new to build.
- A Tauri v2 capability/permission entry
  (`src-tauri/capabilities/default.json`) granting filesystem scope to
  that directory.

### macOS-specific
- Build-time only: Xcode Command Line Tools (`clang`) to compile the
  vendored SQLite source — already a baseline `chain doctor`
  requirement, nothing new.
- Data directory convention: `~/Library/Application Support/<bundle-id>/`.
- No App Sandbox entitlement needed unless mneme is ever distributed
  through the Mac App Store — a later decision, not now.

### Windows-specific
- Build-time only: MSVC Build Tools (C++ workload) to compile the
  vendored SQLite source — already a baseline `chain doctor`/Tauri
  Windows requirement, nothing new.
- Data directory convention: `%APPDATA%\<AppName>\`.
- Known risk to verify explicitly (chain-sdk rule 3, no
  single-platform contracts): SQLite WAL mode has documented issues
  over network-mapped drives, and antivirus/Defender can transiently
  lock db files during writes. Worth a
  `capabilities/storage/research/WINDOWS.md` note once this capability
  exists (rule 8).

## Suggested next step for chain-sdk

Per rule 1 (contract first): draft
`capabilities/storage/CONTRACT.md` + `contract.ts` for the shape above
before any `rusqlite` wiring — same process already used for
`platform`.
