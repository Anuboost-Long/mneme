# Capability Request 16 — Open the file picker as a window-attached sheet

Source: chat file attachments (`docs/features/25-chat-file-attachments.md`).
The user compared the picker with ChatGPT's in a browser and found it
appears abruptly.

## What's wrong (verified in source, not assumed)

The web page's `<input type="file">` opens the macOS picker through
wry's WKUIDelegate,
`wry-0.57.0/src/wkwebview/class/wry_web_view_ui_delegate.rs:100-124`
(mneme's locked 0.55.1 has the same code):

```rust
let open_panel = NSOpenPanel::openPanel(mtm);
...
let ok: NSModalResponse = open_panel.runModal();
```

`runModal()` shows the panel as a free-floating **app-modal window**, with
no sheet animation, and blocks the main thread in a nested run loop
until it closes. Safari and Chrome use
`beginSheetModalForWindow:completionHandler:`: a **sheet attached to the
window**, which macOS animates out of the title bar. That's the whole
visible difference. Nothing in the web layer can change how the picker
is presented.

## Options

**A — `desktop.files.pick()` in chain-sdk (recommended).** chain-core
presents the panel itself as a sheet on the calling window. For example,
`rfd`'s `AsyncFileDialog` with `set_parent(window)` uses
`beginSheetModalForWindow` on macOS. Please verify that. It also works
on Windows and Linux.

```
pick(options?: { multiple?: boolean; extensions?: string[] }):
  Promise<{ name: string; size: number; bytes: Uint8Array }[]>   // [] on cancel
```

- Returns names and bytes, **never a path**. That keeps the `files`
  contract's "no real paths in JS" rule.
- Picking is only an OS-level action; the app decides what to do with
  the bytes. A later request-14 image flow can `files.write` them.
- It doesn't block the main thread the way `runModal` does.
- A size limit or streaming isn't needed now. mneme caps PDFs at 20 MB
  before reading.

**B — Fix wry itself.** Use `beginSheetModalForWindow` with
`webview.window()` when there is one, and fall back to `runModal`.
That's small, and it would fix every `<input type="file">` in every
Chain app with no API change. But carrying it before upstream merges it
means a `[patch.crates-io]` wry fork, which has to track Tauri's pinned
wry version. Worth sending upstream either way. On its own, it's more
maintenance for chain-sdk than A.

## What mneme will do with it

Composer's paperclip calls `desktop.files.pick({ multiple: true })` and
turns each result into a `File` for the existing `readAttachment()`.
Paste and drag-and-drop are already in-page and unaffected. The hidden
`<input type="file">` stays as the fallback outside the desktop runtime
(`UNSUPPORTED`).

## Please update in mneme when done

Update mneme's `@chain/sdk`, add the capability's `CONTRACT.md`, and
signal mneme's session (`mneme-2c`) to continue.
