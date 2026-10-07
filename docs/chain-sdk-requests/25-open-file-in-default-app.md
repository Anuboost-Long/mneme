# Capability Request 25 — Open a stored file in its default app

Source: Phase 7 "Add file attachments" / Phase 13 "Open attachments".
A page can now hold file attachments (a PDF, slides, a spreadsheet, a
zip…) stored through `desktop.files.write`. The user needs to open one
the way Finder would, in Preview, Keynote, Excel and so on.

## Why mneme can't do this today

- `desktop.files.url(reference)` gives a webview URL. That works for
  what the webview can render (images, audio, video, PDF), but not for
  `.pptx`, `.xlsx`, `.zip` or anything else, and even a PDF is better in
  the user's own viewer.
- `desktop.files.save` copies a file out through a save panel. That's a
  workaround, not "open".
- Shelling out through `processRunner` (`open <path>`) would put a
  macOS-only native call in the app, and the app doesn't know the path
  anyway: references are opaque.

## What's asked for

```
desktop.files.open(reference: string): Promise<void>
```

This opens the managed file with the OS default app for its type (macOS
`NSWorkspace open`, Windows `ShellExecute`, Linux `xdg-open`).

- It rejects with `NOT_FOUND` for an unknown or deleted reference.
- It rejects with a clear error when no app handles the type.
- The file keeps the extension it was written with, which is how the OS
  picks the app, so `write(bytes, { extension })` already covers this.

Optional, if it fits: `desktop.files.reveal(reference)` shows the file
in Finder/Explorer. This is the "reveal" left out of request 17.

## What mneme will do with it

The attachment block's **Open** button calls `desktop.files.open`.
Until this ships, mneme shows a preview of what the webview can render,
plus **Save a copy…** through `desktop.files.save`.

## Please update in mneme when done

Update mneme's `@chain/sdk` and the files CONTRACT.md, then signal the
mneme session.
