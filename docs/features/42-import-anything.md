# Phase 42 — Import Anything

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 42 (steps
and research written 6 October 2026). Builds on the importer (Phases
10–13), the school window (`11-authenticated-lms-pages.md`), content
detection (`12-smart-content-detection.md`), OCR (`15-ocr.md`),
transcription (`17-speech-to-text.md`) and flashcards for imports
(`37-flashcards.md`). Depends on chain-sdk request 39
(`docs/chain-sdk-requests/39-transcribe-video-and-opus.md`) for WebM
lecture videos.

## Status

Shipped 7 October 2026, verified in the dev build: seven files dropped on
a module at once (text, PNG, m4a, MP4, MOV, WebM, a silent MP4), an
article link, a JavaScript-built page through the browser window
(excalidraw.com, then Notion's help centre), a pasted picture through
⌘P → Import. Chain request 39 is in the speech contract: MP4, MOV and
WebM/Opus transcribe, and a video without sound rejects with
`NOT_FOUND` "the file has no sound track".

Fixed while verifying:

- Transcriptions queue one after another (`import-media.ts`); the
  engine takes one at a time, so a batch with several recordings failed
  all but the first with `UNAVAILABLE`.
- Flashcards for imports queue too (`autoFlashcards.ts`); a module's
  run in progress made every other page in a batch skip its cards.
- Plain text: a short line followed by a sentence becomes a heading,
  not only "Week 3"-style lines.
- A link whose page is only its title (`<h1>`) counts as empty and
  offers the browser window.

Known limits: due dates in a table (a picture's "Task | Due date"
columns) aren't found, since detection reads due-date sentences. A
lecture's or lesson's due dates are listed on the page but become tasks
only on assignment, discussion and exercise pages (Phase 36). A video
whose transcription failed has no Transcribe button to retry it.

## Goal

Bring learning material from anywhere into a module through one Import:
a school page, any website or article, a PDF, Word, Markdown or text
file, a picture or screenshot, an audio file or a recorded lecture.
Everything becomes a page the rest of mneme works with.

## How it works

- **One Import** on the module (the Import button, ⌘P → Import, or
  dropping files onto the module's pages). It takes:
  - **a link**: school pages as before; any other page that reads as an
    article goes through Mozilla's Readability (Firefox's Reader View), with
    its author, site and date at the top. Pages built by JavaScript
    (Notion, Google Docs and the like), or a link that comes back empty,
    offer **Open in a browser window**: the page opens beside mneme and
    **Import this page** reads what it shows;
  - **files**: PDF, Word, Markdown, plain text, pictures (PNG, JPEG,
    WebP, GIF, HEIC), audio (m4a, mp3, wav, aiff, flac, ogg, opus, caf)
    and video (mp4, mov, m4v, webm, mkv);
  - **pasted content** (⌘V anywhere in Import): a picture or screenshot
    imports as a picture, a link fills the link, and text or copied web
    content becomes a page.
- **Pictures and screenshots** become a page with the picture and its
  text, recognized on the device, with tables as tables.
- **Plain text**: paragraphs, with headings found as in Word and
  Markdown imports.
- **Audio files** become a Lecture page with the recording; **videos**
  a Lecture page with a player. Their sound is transcribed on the device
  in the background (the jobs tray shows the progress) and the transcript
  goes under the recording or video, with any due dates and activities
  it mentions. A video with no sound says so.
- **Several files at once**: each becomes its own page, one after the
  other, with progress and anything that failed listed with why. Their
  findings (due dates, activities, files) are all kept.
- **Every import** gets Phase 12's detection (type, due dates,
  activities, files), turns activities into tasks, makes flashcards when
  that setting is on, and remembers its source: a page shows "From
  example.com" (a link) or "From lecture.m4a" (a file) under its title.

## Data model

Migration `0042-page-source`: `page.source`, the link or file name the
page was imported from (null for pages made in mneme).

## Source locations

- `src/features/courses/lib/file-import.ts`: every file kind.
- `src/features/courses/lib/article-import.ts`: Readability for links.
- `src/features/courses/lib/import-save.ts`: saving an import as a page
  (findings, tasks, flashcards, source), shared by one import and several.
- `src/features/courses/lib/import-media.ts`: audio and video pages and
  their background transcription.
- `src/features/courses/components/LmsImportForm.tsx`, `ImportBatch.tsx`.

## Acceptance criteria

- [x] One Import: the module button, ⌘P and dropping files on the module.
- [x] An article link imports its article with author, site and date.
- [x] A Notion or empty page offers the browser window and imports what it shows.
- [x] A text file imports as paragraphs and headings.
- [x] A picture imports with its recognized text and tables.
- [x] A pasted screenshot imports as a picture.
- [x] An audio file imports with its recording and a transcript.
- [x] A lecture video imports with a player and a transcript (MP4, MOV, WebM).
- [x] Several files import as one page each, with progress.
- [x] Every import gets detection, tasks, flashcards and its source.
