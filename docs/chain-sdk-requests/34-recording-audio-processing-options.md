# Capability Request 34 — Developer options for recording audio processing

Source: mneme's recording feature (4 October 2026), following request 33.
The user wants Chain app developers to choose how a recording is
processed, not only whether echo is cancelled. Request 33 listed noise
suppression as optional, so it wasn't built. This request makes the
processing options a requirement.

## The problem

`desktop.audioRecorder.start()` has one processing switch,
`echoCancellation`. A developer can't remove background noise (fans,
typing, room hum) or even out a quiet or distant voice. An app like
mneme can't give its users those choices either.

SpeexDSP is already vendored for request 33, and its preprocessor covers
these. Using it adds no new dependency.

## What's asked for

The exact shape is chain-sdk's contract decision (rule 1). For example,
grouped options on `start()`:

```ts
start({
  source,
  echoCancellation?: boolean,       // as in request 33
  noiseSuppression?: boolean,       // remove steady background noise
  autoGainControl?: boolean,        // even out quiet and loud speech
  onLevel
})
```

- **Noise suppression**: on or off. If the strength is worth exposing
  (Speex's suppression level in dB), add it as an option with a sensible
  default, and document the trade-off: stronger suppression can make a
  voice sound processed.
- **Automatic gain control**: on or off, for someone far from the mic
  or a quiet speaker. Document how it interacts with "both": the
  computer audio shouldn't be pumped.
- Anything else the preprocessor offers that's worth a switch (for
  example dereverberation): include it if it works well, and say why
  if you leave it out.
- **Which sources each option applies to**: these act on the
  microphone, so they should apply to "microphone" and "both" (the mic
  side, before mixing), and be ignored for "system". "microphone" now
  has to go through the native path for this to work there. Say if
  that's not the case.
- **Defaults**: existing recordings must sound the same unless the app
  opts in, so noise suppression and gain control default to **off**.
  Echo cancellation keeps its default of on.
- **Availability**: report each option in `availability()`, as
  `echoCancellation` is, so an app only shows the options that work.
- **Unchanged**: the level (it reflects the processed audio), pause,
  resume, stop, cancel, real-time processing, and fixed memory for 2–3
  hour recordings.
- Windows parity (rule 3), as for request 33.

## What mneme will do with it

In Settings → General → Recordings, next to **Reduce echo when
recording both**, each shown only where `availability()` reports it:

- **Reduce background noise**, off by default.
- **Even out voice volume**, off by default.

Both are saved on this device and passed to `start()` for Microphone and
Both. See `docs/features/recording-sources.md`.

## Please update in mneme when done

Update mneme's `@chain/sdk` and the capability's CONTRACT.md, then
signal the mneme session.
