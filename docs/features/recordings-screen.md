# Recordings screen

Every recording in one place, at `/recordings`. It's in the sidebar under
Chat. It's for looking through what you've recorded (on pages, or from
Home's Recorder widget), playing it, transcribing it, and deleting what
you don't need.

## Status — 30 September 2026

**Implemented and verified in the running app** with a generated test
tone. The following were exercised:
- the list and its toolbar
- expanding a recording: the player and its transcript area
- transcribing (a tone has no speech, which the screen reports)
- delete, which also removes the recording's block from its page

The tone has no speech, so a transcript actually appearing hasn't been
checked with real speech yet.

## What it shows

- **Header:** a count and the total length ("12 recordings · 3:41:05 in
  all").
- **The same toolbar as other lists:**
  - search across name, page, module, course and transcript text
  - a course filter
  - sort by Newest, Oldest, Longest or Name
  - group by day, week or month (Month by default)
  - Sort and grouping are remembered (`mneme.recordings.sort`,
    `mneme.recordings.group`).
- **One grouped surface per date group, with divider lines.** Each row
  shows:
  - a mic glyph
  - the name
  - the page · course › module, on a second line
  - a "Transcript" tag when it has one
  - its length, and when it was recorded
- **Clicking a row expands it in place** (one open at a time;
  `RecordingDetails`):
  - the cassette `PlaybackDeck` that page recording blocks use, with the
    same speed and skip preferences
  - the transcript (scrollable), "No transcript yet", or "No speech was
    found"
  - **Transcribe** / **Transcribe again**. This uses
    `transcribeRecording`, with the engine and language last chosen in a
    page's transcript panel, and shows progress.
  - **Add transcript to page:** appends the transcript as paragraphs at
    the end of the recording's page. It's disabled once added.
  - **Open page**
  - **Delete**, after confirmation. `deleteRecordingFromPage` removes the
    audio file, the row, and the recording's block in the page's content,
    so the page doesn't keep an empty "missing" block. This is a hard
    delete, like everywhere else.

## Code

- `src/routes/RecordingsRoute.tsx` loads `getAllRecordings()` and applies
  transcript changes and deletes to its list.
- `src/features/recordings/pages/RecordingsPage.tsx` has the toolbar,
  groups and rows.
- `src/features/recordings/components/RecordingDetails.tsx` is the
  expanded panel.
- `src/features/courses/lib/recordings.ts` has `getAllRecordings` and the
  `RecordingListItem` type.
- `src/features/courses/lib/pages.ts` has `deleteRecordingFromPage` and
  `appendToPage`.
- `src/features/courses/lib/transcription.ts` is shared with the page's
  transcript panel and Home's Recorder.
