# Capability Request 32 — Record the computer's own audio

Source: mneme's recording feature (4 October 2026). The user wants to
record what the laptop is playing, such as an online lecture, a video
call or a video, and to choose the source each time: **microphone**,
**computer audio**, or **both together**.

## The problem

mneme records through the webview's `getUserMedia` + `MediaRecorder`
(the microphone capability, request 18). A webview can only reach input
devices. WKWebView has no way to capture the system's output (no
`getDisplayMedia` audio), so the computer's own sound is out of reach
from JS.

## What's asked for

A native capture capability that records the microphone, the computer's
output audio, or both mixed into one track, and hands mneme a finished
audio file. The exact shape is chain-sdk's contract decision (rule 1);
roughly what mneme needs:

- **Start with a choice of sources:** microphone, system audio, or both.
  With both, one mixed track (not two files), with the two levels
  balanced so a voice over a lecture stays audible.
- **Pause, resume and stop.** The paused span is left out, as with
  `MediaRecorder` today. Stop resolves with a `desktop.files` reference,
  the MIME type and the duration in milliseconds, the same facts mneme
  stores for a recording now.
- **Live input level** while recording (for example a level event a few
  times a second, 0–1), which mneme draws as its waveform.
- **Cancel**, which discards the take and its file.
- **Availability check**, so mneme only offers "Computer audio" and
  "Both" where they work (OS version, platform).
- **Permissions:** declared in the app's `package.json` under
  `chain.permissions`, like the microphone. A refusal rejects with a
  `ChainError` code mneme can tell apart from other failures, so it can
  show how to turn access on in System Settings. Recording mneme's own
  output (read-aloud) is fine to include or exclude; say which.
- **Long recordings:** a lecture can run 2–3 hours, so the file should be
  written as it records, not held in memory.

mneme would then use this capture for all three choices, microphone only
included, so there is one recording path rather than two. If chain-sdk
prefers to keep microphone-only on `getUserMedia`, say so and mneme will
keep both paths.

Keep Windows parity (rule 3), for example WASAPI loopback for system
audio.

## What mneme will do with it

See `docs/features/recording-sources.md`: a source choice (Microphone,
Computer audio, Both) on Home's recorder and on a page's recording
block, remembered between recordings; the same save, transcribe and
Recordings flow as today for the finished file.

## Please update in mneme when done

Update mneme's `@chain/sdk` and add the capability's CONTRACT.md, then
signal the mneme session.
