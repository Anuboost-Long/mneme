# Phase 16 — Audio Recording

Record lectures, explanations or personal notes into a page.

## Status — 28 September 2026

**Implemented** on [chain-sdk request 18](../chain-sdk-requests/18-microphone-capture.md),
which shipped as a `package.json` declaration
(`"chain": { "permissions": { "microphone": … } }`) rather than a new JS
API. `chain build` now writes `NSMicrophoneUsageDescription` into the
bundle (checked in the built `Info.plist`) and generates
`Entitlements.plist` with `audio-input`. The entitlement is embedded only
in a signed build. Typecheck, web build and `chain migration check` pass.
**Not yet recorded end to end in the app.** Under `chain dev`, macOS
charges the microphone to the terminal or editor that launched it, and
that app may reject with no prompt. Test with the built `.app`, or give
the terminal microphone access.

## How it works

- Migration 0016 `recording` (`db/schema/recording.ts`) and
  `lib/recording/`. Foreign keys aren't enforced, so page, module and
  course deletes call `deleteRecordings()` first. It deletes the audio
  files, then the rows.
- `lib/useAudioRecorder.ts`: the recorder is `MediaRecorder` with its
  default type (`audio/mp4; codecs=mp4a.40.2` in WKWebView), and chunks
  are flushed every second. The duration excludes pauses. The level
  meter reads an `AnalyserNode`.
- `/Recording` (slash menu) inserts a `recording` block
  (`RecordingBlock.ts`) that records in place, then becomes a player:
  native `<audio controls>` for play and seek, plus Rename and Delete.
  Delete asks for confirmation inline, then removes the file, the row and
  the block.
- Removing the block by editing (for example, Backspace) keeps the
  recording, so undo can restore it. Its file is cleaned up when the page
  is deleted.

## Deferred

- Backups don't include recordings or their audio. They don't include
  page images either.
- There's no list of a page's recordings outside the editor, and no way
  to re-attach an orphaned one.
