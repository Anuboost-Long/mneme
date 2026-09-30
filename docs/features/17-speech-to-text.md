# Phase 17 — Speech-to-Text

Recording → Transcription → Raw transcript → AI cleanup → Study notes.

## Status — 28 September 2026

**Implemented** on [chain-sdk request 19](../chain-sdk-requests/19-speech-transcription.md)
(`desktop.speech`, on-device: SpeechAnalyzer on macOS 26, with an
SFSpeechRecognizer fallback before it). `chain update` added the
native commands, a tracked `build.rs` (`-rpath /usr/lib/swift`) and
`minimumSystemVersion` 12.0, **so mneme now requires macOS 12+**.
Typecheck, web build and `chain migration check` pass. chain-sdk
verified a 60-minute lecture and a real mneme-style MediaRecorder file in
its playground. **Not yet run from mneme's own recording block.**

## How it works

- A saved recording block now has a transcript area. "Transcribe"
  opens a spoken-language picker (`desktop.speech.locales()`, defaulting
  to the last language used, then the system's), then shows a progress
  bar with Cancel. Leaving the page cancels too.
- `saveTranscript()` stores the segments (JSON) and a transcript with one
  line per segment on the `recording` row. That keeps an hour-long
  lecture as phrase-sized paragraphs rather than one block.
- The transcript opens in an editable textarea. "Save changes" stores
  edits. "Insert into page" adds the lines as paragraphs below the block
  and selects them. "Transcribe again" reruns it, for example in another
  language.
- Migration 0017 (hand-written, `--empty`) adds a built-in **Clean
  transcript** AI action, placed after the user's own actions.
  "Summarize transcript" is the existing Summarize action on the inserted
  selection. Both run through the agent route, with no provider call from
  mneme.
- `package.json` declares `chain.permissions.speechRecognition`, which
  only the pre-macOS-26 fallback prompts for.
- Error messages cover a missing locale (`UNSUPPORTED`, naming it),
  another transcription already running, speech recognition switched off
  (fallback only), a missing audio file, and "No speech was found in this
  recording."

## Deferred

- Timestamps: segments are stored, but there's no insert-with-timestamps
  and no click-to-seek yet.
- Captions from segments (a WebVTT `<track>`).
- Transcribing audio files the user adds, rather than records.

## Windows

The system engine stays unavailable on Windows (WinRT speech can't
transcribe a file), but a downloaded model from
[Extensions](extensions.md) works there. That's untested on Windows,
and needs AAC recordings (see extensions.md). "Transcribe" there shows the
`UNSUPPORTED` error's own message, or "Transcription isn’t available on
this system." if it has none. See chain-sdk
`agent-docs/capabilities/speech/research/WINDOWS.md`.
