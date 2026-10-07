# Capability Request 39 — Transcribing video files and Opus sound

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 42
("Import Anything"): "Lecture recording (video file): the video plays
on the page and its sound is transcribed." mneme's plan is in
`docs/features/42-import-anything.md`.

## The problem

Students import recorded lectures as video files. mneme stores the file,
shows it as a player and transcribes its sound with
`desktop.speech.transcribe` (request 19). The contract lists audio
files only (m4a/AAC, mp3, wav, flac, ogg/Vorbis, caf, aiff, "not Opus").

Tried in the dev build on 6 October 2026, with the same spoken sentence
in each container:

| File           | Video | Sound | Result                                                                                           |
| -------------- | ----- | ----- | ------------------------------------------------------------------------------------------------ |
| `lecture.mp4`  | H.264 | AAC   | Transcribed word for word                                                                        |
| `lecture.mov`  | H.264 | AAC   | Transcribed word for word                                                                        |
| `lecture.webm` | VP8   | Opus  | `NATIVE_FAILURE`: "couldn't read the audio: unsupported feature: core (codec):unsupported codec" |

So video containers already work, but nothing promises they will, and
WebM (the format browsers and many lecture tools record in) can't be
transcribed at all. Opus is also what `.opus` and `.webm` audio files
use.

## What's asked for

The exact shape is chain-sdk's contract decision (rule 1). Each of the
following is a requirement.

- **Video files are input.** `transcribe(reference)` accepts a video
  file and transcribes its first sound track: at least MP4, MOV and M4V
  with AAC sound (working today), and WebM. The contract says so, and
  tests cover it, for every engine (the system engine and downloaded
  models).
- **Opus sound decodes.** Opus in WebM, Ogg (`.opus`, `.ogg`) and
  Matroska, so a WebM lecture video and an `.opus` voice note can be
  transcribed like any other file.
- **A file with no sound track** rejects with a code the app can tell
  apart from an unreadable file (for example `NOT_FOUND` with a message
  saying there's no sound, or a new code), so mneme can say "This video
  has no sound to transcribe" instead of a generic failure.
- **Progress and timestamps** behave as for audio files: progress from
  0 to 1 over the length of the sound, segment times from the start of
  the file.
- **Update mneme's `@chain/sdk`** to the new contract when it ships.

## Not asked for

- Transcoding or extracting the sound into a separate file; mneme keeps
  the video as it is and only needs its transcript.
- Reading text shown in the video picture.
