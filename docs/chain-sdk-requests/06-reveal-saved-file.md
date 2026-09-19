# Capability Request 6 — Reveal a saved file in the OS file manager

Source: user report — "when downloading a backup there should be a
button to take me to that download file."

## Why mneme can't build this today

`src/features/courses/lib/backup.ts`'s `downloadBackup()` uses the plain
web download trick: a `Blob` + `URL.createObjectURL` + a hidden
`<a download>` click. That's a genuine Web API (not a Tauri/native call),
so it needs no new capability to keep working — but by design, browsers
(and Tauri's webview, which behaves the same way here) never hand the
page's JS the final saved path. `SettingsPage.tsx` can show "Backup
downloaded." after the click resolves, but it has no path to put a
"Show in Finder"/"Show in Explorer" button behind, because the browser
never tells it one.

Reaching for a raw OS "reveal in file manager" shell call directly from
`src/features/courses/lib/backup.ts` would mean touching a native/OS API
straight from the webview, which mneme's own rule (see `AGENTS.md`,
already the reasoning behind the `http`/`files` capabilities in
`04-lms-page-fetch.md`/`02-files.md`) says never to do — this has to be a
chain-sdk capability, the same way those were.

## What mneme needs

Two capabilities, both native-side, that compose to fix this:

1. **A real save-file dialog** that returns the absolute path the user
   picked, e.g. `desktop.dialog.saveFile({ suggestedName, contents })` (or
   split into "ask for a path" + "write bytes to it" if that fits
   chain-sdk's existing `files`-style contract better) — mirrors Tauri's
   own `@tauri-apps/plugin-dialog` `save()`, wrapped the same way `files`
   already wraps filesystem access, so mneme still never touches
   `@tauri-apps/*` directly.
2. **Reveal-in-folder**, e.g. `desktop.shell.showItemInFolder(path)` —
   opens Finder/Explorer/the platform file manager with that exact file
   selected. This is the piece that actually answers the request: once
   mneme has the real path from (1), a "Show in folder" button next to
   "Backup downloaded." can call this with it.

Restore (`readBackupFile` in the same file) already works fine as-is —
it's a plain `<input type="file">`, no capability needed there. This
request is scoped to the save/export side only (rule "one phase at a
time" — don't fold restore's file-picker into this).

## Native module survey — macOS vs Windows

Same shape as `platform`/`http`: portable behavior via existing
crates/plugins, platform convention differs, not implementation:

- **Save dialog**: `rfd` (already what Tauri's own dialog plugin uses
  under the hood) or wiring the dialog plugin directly — works
  identically on both OSes through one call.
- **Reveal in folder**: needs actual OS-specific commands under one
  Rust-side function — `open -R <path>` on macOS (reveals + selects),
  `explorer /select,<path>` on Windows. No single portable primitive
  covers "reveal and select" the way `reqwest`/`rusqlite` are portable
  for `http`/`storage` — this one genuinely needs the `#[cfg(target_os)]`
  branching `platform`'s README already established as the normal shape
  for OS-divergent capabilities.

## Where this needs to live

New `crates/core/src/dialog.rs` (or extend an existing capability if
chain-sdk already has a closer home for it) plus the matching
`capabilities/dialog/contract.ts` — not app code. `backup.ts` and
`SettingsPage.tsx`'s "Show in folder" button are the app-level pieces on
top, once the capability exists.

## How to verify it's actually fixed

In mneme's real dev window: click "Download a backup", confirm a native
save dialog appears (not the current silent browser-download-folder
behavior), pick a location, then confirm a "Show in folder" button
appears and actually opens that exact folder with the file selected —
not just a folder-open with no selection, which is a materially worse
result on both platforms.
