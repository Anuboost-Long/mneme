# Capability Request 17 — Save a file where the user chooses, via a native sheet

Source: user request — "downloading a backup should show a file explorer
window so the user can pick where to keep their backup." Replaces the
save-dialog half of `06-reveal-saved-file.md`, which was never built and
asked for a returned path, which the `files` contract now rules out.

## Why mneme can't do this today

`src/features/courses/lib/backup.ts`'s `downloadBackup()` uses the web
download trick (`Blob` + hidden `<a download>`). In the Tauri webview
that saves straight into Downloads, with no dialog. JS can't open a
native save panel, and `desktop.files` has `pick()` for opening files
(request 16) but nothing for saving.

## What's asked for

The save counterpart of `pick()`: the same sheet-on-the-calling-window
presentation (rfd `AsyncFileDialog::save_file` with `set_parent`, which
should use `beginSheetModalForWindow` like `pick()` does), and the same
no-paths rule.

```
save(bytes: Uint8Array, options?: SaveOptions): Promise<SavedFile | null>

interface SaveOptions {
  suggestedName?: string;   // "mneme-backup-2026-09-28.json"
  extensions?: string[];    // same rules as PickOptions.extensions
}
interface SavedFile { name: string }   // the name the user settled on, never a path
```

- **Every call shows the panel**, which is the user's explicit
  requirement: "ask the user for the file location every time". Never
  save silently to a remembered or default location, and add no "don't
  ask again" option. The panel may *start in* the last-used folder (the
  OS default); the user still confirms the location each time.
- The native side writes `bytes` to the chosen location itself. JS never
  sees the path.
- Cancel resolves `null`.
- If the user keeps a name without the extension while `extensions` is
  given, append the first one (as NSSavePanel's `allowedContentTypes`
  does).
- Overwriting: leave it to the OS panel's own "Replace?" confirmation.
- Errors: `INVALID_ARGUMENT` for a bad extension, `UNAVAILABLE` if a
  picker or save panel is already open (like `pick()`), `NATIVE_FAILURE`
  with the OS message if the write fails (permissions, disk full).

## Optional, if cheap

Request 06's other half: a "Show in Finder" after saving. Without
exposing the path, that could be `SavedFile.reveal(): Promise<void>`, or
a `reveal` id the native side keeps for the last saved file. Skip it if
it complicates the contract; mneme only needs `save()` now.

## What mneme will do with it

`downloadBackup()` calls `desktop.files.save(bytes, { suggestedName,
extensions: ["json"] })`. Settings shows "Backup saved as <name>.", or
nothing on cancel. Outside the desktop runtime (`UNSUPPORTED`) it keeps
the current `<a download>` fallback.

## Please update in mneme when done

Update mneme's `@chain/sdk` (a file link, so the types show up), note
any `lib.rs` template change for `chain update`, update CONTRACT.md,
then signal mneme's session (`mneme-2c`).
