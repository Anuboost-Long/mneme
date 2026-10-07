# Capability Request 29 — Free the TTS model when it's idle

Source: mneme's performance pass (1 October 2026), cleanup item #3. The
user decided: keep warming up the voice, but **let go of the model after
1 minute of not using it** to free the memory.

## The problem

mneme warms up the user's downloaded read-aloud voice when a module or
page opens (`desktop.tts.voices(...)`), so Listen starts instantly.
`crates/core/src/sherpa/tts.rs` keeps that engine in `LOADED` until a
different model replaces it, and nothing ever frees it. Traced in mneme's
dev build: the app process grows from about 94 MB to about 700 MB and
stays there for the rest of the session, even if the user never presses
Listen.

`TtsApi` has no way to release it: there's `voices`, `synthesize`,
`compile` and `cancel`, but no `unload`.

## What's asked for

Free the loaded engine after a period with no TTS use. The exact shape is
chain-sdk's contract decision (rule 1); roughly:

- **Idle unload, natively.** After the last `voices`/`synthesize`/
  `compile` finishes (a running compile counts as in use for as long as
  it runs), start an idle timer. When it fires, drop `LOADED` and free the
  sherpa-onnx engine. Any later call reloads the model as it does today.
- **A timeout the app can change at any time**, which mneme sets to 60
  seconds. For example `desktop.tts.setIdleUnload(ms)`, callable whenever
  the app wants (at startup, or later from a setting), with `0` or `null`
  meaning never. A new value applies to the running timer straight away.
  Native ownership matters: it sees every use and survives webview
  reloads, which a JS timer in the app wouldn't.
- **An explicit `unload()`** (required, not optional), so an app can free
  the model right away, for example when the user turns read-aloud off or
  leaves the reading screen. It resolves once the memory is freed, is a
  no-op when nothing is loaded, and waits for a call in flight to finish
  rather than interrupting it.

Unloading must never interrupt a call in flight: a timer that fires
mid-call does nothing.

Keep Windows parity (rule 3). The engine is the same sherpa-onnx code on
both platforms, so this should need no per-OS branching.

## What mneme will do with it

Set the timeout to 60 s at startup, next to `initDb()`. Keep the warm-up
800 ms after a module or page opens: Listen still starts instantly in
that minute, and the memory comes back afterwards. mneme will confirm
with `chain inspect --trace` that the app process drops back to its
baseline about a minute after the last use.

## Please update in mneme when done

Update mneme's `@chain/sdk` and the tts CONTRACT.md, then signal the mneme
session.
