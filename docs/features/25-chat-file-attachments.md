# Phase 25 — Chat File Attachments

Attach files to a chat message, as ChatGPT allows: click the paperclip,
paste a file, or drop it on the composer.

## Status — 28 September 2026

**Part 1 (text files and PDFs): implemented.** Typecheck, web build and
the migration test pass. It hasn't been run against a live agent yet.
**Part 2 (images, native picker): implemented** on chain-sdk requests
14 and 16. Claude's image route was confirmed live; the rest hasn't been
run end to end in the app yet.

## Part 1 — Text files and PDFs (no new capability)

- Composer: paperclip button (hidden `<input type="file" multiple>`),
  paste, and drag-and-drop. Each file is a card (`AttachmentCard.tsx`):
  a thumbnail of its opening text, a type badge, and "N pages/lines ·
  size". Clicking a card opens a preview dialog. A placeholder card shows
  while a file is read, and Send waits for it. Duplicates (same name) are
  skipped.
- Accepted: text files up to 1 MB, and PDFs up to 20 MB. A PDF's text is
  extracted in the webview with pdf.js (`shared/lib/pdf.ts`, shared with
  the course importer) and sent as `[Page N]` sections. A PDF with no
  text layer (a scan) is refused. Other binary files are detected by a
  NUL character and refused.
- Claude/Codex receive the files on **stdin**, each as a
  `<file name="...">` element (request 12). The prompt says so. Other
  agents get them inline in argv, under `MAX_ARGV_CONTEXT_CHARS`, which
  moved into `runTurn.ts` beside `acceptsStdin`.
- Migration 0015 adds `agent_message.attachments`: a JSON list of
  `{ name, size, kind, count, preview, truncated }`. The preview is the
  first 4,000 characters. The transcript shows the same cards above the
  message text. The full file text isn't stored. The CLI's own session already has it for
  follow-ups.

## Part 2 — Images and the native picker (capabilities 14, 16)

- PNG, JPEG, GIF and WebP, up to 5 MB each (Claude's per-image limit).
  At send time each image is written to `desktop.files`. Its reference
  is saved in the attachment JSON, so the transcript card and preview
  show the real image (`files.url`). Deleting a conversation, directly or
  through retention, deletes its images first (`conversations.ts`, via
  `json_each`).
- Claude: the turn switches to `--input-format stream-json`. One user
  message goes on stdin: a text block (prompt plus any text files), then
  base64 image blocks. **Confirmed live**, fresh and with `--resume`.
- Codex: `--image <fileReference>` per image, appended after the prompt.
  **Not run live**, and `exec resume` accepting `--image` is unverified.
- Other agents: sending an image is refused with a message naming the
  agent.
- Paperclip: `desktop.files.pick({ multiple: true })` opens a sheet on
  the window (request 16). Outside the desktop runtime it falls back to
  `<input type="file">`. Paste, including screenshots, and drag-and-drop
  already reach the same `add()`.
