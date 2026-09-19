# Capability Request 2 — Files (Managed Local Blob Storage)

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 13 ("File
Import") and Phase 14 ("Image Support"); Recommended MVP item 9 ("Image
Import").

One phase at a time, same as request 1 — this covers only file storage.
Later roadmap phases that also touch native OS surfaces (Audio Recording,
Text-to-Speech, secure API-key storage, ...) each depend on different
capabilities and will be relayed separately once we reach them.

## Why this is next

Current progress: Courses/Modules/Pages (Phases 4–6), the basic rich text
editor with slash commands (Phases 7–8), and in-page block drag-and-drop
are built and working. The next unaddressed gap — and the first one that
is actually blocked without a new capability, not just unbuilt UI — is
file storage.

- **Picking or dragging a file onto the window needs no new capability.**
  `<input type="file">` and HTML5 drag-and-drop (`DataTransfer.files`)
  are plain Web APIs that already work inside the Tauri webview — mneme
  already uses exactly this for backup/restore
  (`src/features/courses/lib/backup.ts`, no native call involved).
- **What's actually missing is persisting those bytes somewhere stable.**
  Right now, images pasted/dropped into a page go through
  `src/features/courses/lib/page-image.ts` / `course-image.ts`, which
  base64-encode them directly into the page's `content` TEXT column in
  SQLite. That's a workaround, not the real design — it inflates storage
  ~33%, and it means every read/write of a page's content shuttles full
  image bytes through IPC even when the user isn't looking at that page.
- **The schema already expects real files and has sat unused because of
  this gap.** The `attachment` table
  (`src/shared/lib/db/schema/attachment.ts`) has `file_name`,
  `file_path`, and `mime_type` columns — clearly designed to reference a
  file on disk, not hold a blob — but no app code writes to it, because
  there's nothing to write a `file_path` *to* yet.
- Browsers deliberately don't give web content a writable, app-managed,
  persistent directory (the File System Access API is picker-driven,
  user-visible every time) — this is a genuine native-OS need, not
  something achievable by reaching for a different Web API, matching
  mneme's own rule to never touch a native filesystem/OS API directly
  (see mneme `AGENTS.md`).

## What mneme needs

A capability (name TBD by chain-sdk, e.g. `desktop.files`) for managed
local blob storage — conceptually parallel to what `desktop.storage`
already does for structured data, but for raw bytes:

- Write bytes into the app's own managed storage directory, get back a
  stable reference (an id or relative path) — the app never picks the
  on-disk location itself.
- Read the bytes back later by that reference (to render/export/copy an
  attachment).
- Get a URL usable as an `<img src>`/`<a href>` without loading the full
  bytes into JS memory first, if Tauri's existing asset-protocol
  (`convertFileSrc`) mechanism can be exposed through this the same way
  it already works at the Tauri layer — exact shape is chain-sdk's
  contract decision, not assumed here (rule 2).
- Delete a stored file by reference.

mneme's own use of this (rendering an attachment row, wiring the upload
UI, choosing when to keep base64 for tiny things like course icons vs.
writing a real file for page attachments) is app-level logic on top of
this and is not part of the capability itself.

## Native module survey — macOS vs Windows

Like `storage`, this doesn't need real per-OS native code (no Swift/C#
bridge) — reading/writing files within the app's own directory is
`std::fs` (or `tokio::fs`), already fully portable. What differs is
platform convention and known risk, not implementation:

### Shared (identical on both platforms)
- Rust: `std::fs`/`tokio::fs` for read/write/delete within the app's own
  managed subdirectory — no native adapter needed, same reasoning
  `storage` already established for `rusqlite`.
- App-data directory resolution via the same
  `app_handle.path().app_data_dir()` call `storage` already uses — an
  `attachments/` (or similar) subfolder alongside the existing SQLite
  file, not a new resolution mechanism.
- A Tauri v2 capability/permission entry granting filesystem scope to
  that subdirectory, the same pattern `storage`'s
  `src-tauri/capabilities/default.json` entry already established.
- Tauri's asset protocol / `convertFileSrc` for serving a stored file to
  the webview (e.g. `<img>`) — already part of Tauri core, works
  identically on both platforms, nothing new to build there.

### macOS-specific
- Data directory convention: `~/Library/Application Support/<bundle-id>/attachments/`,
  sibling to where the SQLite file already lives.
- No App Sandbox entitlement needed beyond what `storage` already
  requires, unless mneme is ever distributed through the Mac App Store —
  a later decision, not now.

### Windows-specific
- Data directory convention: `%APPDATA%\<AppName>\attachments\`.
- Known risk to verify explicitly (chain-sdk rule 3, no single-platform
  contracts): historic `MAX_PATH` (~260 char) limits if a stored file's
  path gets long. Mitigation is already implied by the schema's own
  design — `attachment.file_name` (display name) and `.file_path`
  (actual on-disk location) are separate columns, so the capability can
  generate a short id-based filename on disk and let the app keep the
  user-facing name in the database, never round-tripping arbitrary
  user-provided filenames onto disk. Worth confirming in
  `capabilities/files/research/WINDOWS.md` once this capability exists
  (rule 8).
- Antivirus/Defender transient file locks are a smaller risk here than
  for `storage` (a one-time write per attachment, not SQLite's constant
  read/write churn), but still worth a one-line note in that same
  research doc.

## Suggested next step for chain-sdk

Per rule 1 (contract first): draft `capabilities/files/CONTRACT.md` +
`contract.ts` for the shape above before any `std::fs` wiring — same
process already used for `platform` and `storage`.
