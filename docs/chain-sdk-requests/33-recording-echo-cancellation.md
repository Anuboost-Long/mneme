# Capability Request 33 — Echo cancellation when recording both sources

Source: mneme's recording feature (4 October 2026), following request 32.
Recording **both** (microphone and computer audio) on a laptop without
headphones records the lecture twice: once clean from the system-audio
tap, and again a few tens of milliseconds later through the microphone,
picked up from the speakers. The result sounds like an echo, and it
also makes transcription worse.

## The problem

`desktop.audioRecorder` (request 32) mixes the two sources as they are.
The microphone is captured raw through the aggregate device, so nothing
removes the speakers' sound from it.

The fix belongs in chain-sdk, because only the native side has what an
echo canceller needs. `ChainRecorder.swift` already delivers the
microphone and the system tap as separate, sample-aligned blocks in the
same IO cycle, with drift compensation on the tap. The system block is
exactly the far-end reference: cancel it out of the microphone block,
then mix as now.

What doesn't work, for the record:

- The webview's `echoCancellation` constraint only cancels sound the
  webview itself plays, not another app's lecture.
- Apple's voice-processing IO unit, as far as we know, references only
  audio played through that unit, and it also ducks other audio and
  colours the microphone. Please confirm before ruling it in or out.
- Muting the microphone while the computer is loud cuts out the user's
  voice over the lecture, which is the point of recording both.

## What's asked for

The exact shape is chain-sdk's contract decision (rule 1); roughly what
mneme needs:

- **Echo cancellation on "both"**: remove the system audio's echo from
  the microphone before mixing, using the system tap as the reference.
  It should adapt on its own to the speaker-to-mic delay, the volume and
  the room (for example WebRTC's AEC3, or Speex's canceller if that's
  the better fit; say which, and why).
- **The app developer chooses whether it's on.** An option on `start()`,
  for example `echoCancellation?: boolean`, so each recording can turn
  it on or off. Please pick and document the default (mneme suggests on
  for "both"), and say what the option means for "microphone" and
  "system" (ignored, or rejected).
- **Availability says whether it's supported**, for example an
  `echoCancellation` flag in `availability()`, so mneme only offers the
  setting where it works.
- **The level, pause, resume, stop and cancel behaviour is unchanged.**
  The live level reflects the cleaned mix.
- **Long recordings**: lectures run 2–3 hours, so the processing has to
  keep up in real time without growing memory.
- Noise suppression, if the chosen library has it, is welcome as a
  separate option, off by default. It's not required for this request.

Keep Windows parity (rule 3): the WASAPI loopback stream is the
reference there in the same way.

## What mneme will do with it

See `docs/features/recording-sources.md`:

- Settings → General → Recordings gets **Reduce echo when recording
  both** (on by default), saved on this device. It's only shown where
  `availability()` says echo cancellation is supported.
- mneme passes the setting to `start()` when the source is "both".
- Until then, and whenever the setting is off, the source picker shows a
  hint under **Microphone and computer** to use headphones.

## Please update in mneme when done

Update mneme's `@chain/sdk` and the capability's CONTRACT.md, then
signal the mneme session.
