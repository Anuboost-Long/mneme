# Phase 15 — OCR

Turn text inside images (slide screenshots, textbook photos) into
editable page content.

## Status — 28 September 2026

**Implemented** on [chain-sdk request 20](../chain-sdk-requests/20-image-text-recognition.md)
(`desktop.vision.recognizeText`, Vision on macOS, on-device). `chain
update` added the two native commands to `.chain/native/src/lib.rs`.
Typecheck and web build pass. chain-sdk verified recognition end to end
in its playground. **mneme's "Extract text" hasn't been run in the app
yet.**

## How it works

- `shared/lib/ocr.ts`, the OCR service: `extractText(imageSrc)` fetches
  the image the page already shows (its `files.url()` source) and sends
  the bytes to `desktop.vision.recognizeText`. It counts lines under
  0.5 confidence. `UNSUPPORTED` (Windows/Linux) and `INVALID_ARGUMENT`
  get plain messages.
- The image block's hover toolbar gets "Extract text", which opens
  `ExtractTextDialog`. The recognized text is in an editable textarea
  (user corrections), with a note when lines were hard to read, or "No
  text found in this image."
- "Insert below image" or "Replace image" adds each line as a paragraph
  and selects the result. The editor's AI actions (Explain, Summarize,
  custom ones) then run on it directly, which is how the extracted text
  reaches the AI. Replace is undoable with ⌘Z.

## Deferred

- Per-line highlighting of uncertain text. Today it's a count, because a
  textarea can't mark individual lines.
- Sending extracted text straight into the agent chat composer. The app
  has no composer handoff yet.
- "Extract text" on images attached in chat.
- Roadmap Phase 14's "Explain / Summarize image" as dedicated actions.

## Windows

chain-sdk added a Windows backend (`Windows.Media.Ocr`). It compiles but
has never run on Windows. There, confidence is always 1.0, so the
"hard to read" note never appears. Only the first language is used, and
HEIC/WebP need the Store codec extensions.
