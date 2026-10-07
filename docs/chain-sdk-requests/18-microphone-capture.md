# Capability Request 18 — Microphone access for the webview

> **Shipped 28 September 2026:** no JS API. Declare it with
> `package.json` → `"chain": { "permissions": { "microphone": "…" } }`.
> See chain-sdk `agent-docs/capabilities/microphone/CONTRACT.md`.

Source: roadmap Phase 16 (Audio Recording), first step of the Second
Release: "Allow users to record lectures, explanations, or personal
notes." See `docs/features/16-audio-recording.md`.

## Why mneme can't do this today

mneme would record in the webview with `navigator.mediaDevices
.getUserMedia({ audio: true })` + `MediaRecorder`, then store the result
with `desktop.files.write()`. Neither half works in the Chain app:

- The generated bundle's `Info.plist` has no
  `NSMicrophoneUsageDescription`. macOS kills a process that touches the
  microphone without one.
- A signed/hardened build also needs the
  `com.apple.security.device.audio-input` entitlement, which lives in
  `.chain/native/`. That folder is framework-owned, and mneme's rules
  keep it out of mneme's hands.
- It's unverified whether the wry/WKWebView version Chain pins answers
  WebKit's `requestMediaCapturePermissionFor…` delegate. If it
  doesn't, `getUserMedia` rejects even with the plist key.

## What's asked for

Preferably **no new JS API**: make the standard web APIs work in the
webview.

1. Let an app declare microphone use, for example
   `chain.config` / `tauri.conf.json` → `"permissions": { "microphone":
"mneme records lectures and notes you choose to capture." }`. Chain
   then emits `NSMicrophoneUsageDescription`, the audio-input
   entitlement, and whatever the Windows/Linux equivalent is. Without
   the declaration, nothing changes.
2. Make sure the webview grants microphone capture for the app's own
   origin. The OS (TCC) prompt stays the real gate. The webview must not
   add a second prompt of its own, or it should at least never
   auto-deny.
3. Confirm `MediaRecorder` is available and which container/codec it
   produces in WKWebView (expected `audio/mp4` AAC) and in WebView2
   (expected `audio/webm` Opus). mneme stores whichever it gets.

Errors are the web APIs' own. The OS denial surfaces as
`NotAllowedError` from `getUserMedia`. mneme handles it with a
"Microphone access is off. Turn it on in System Settings → Privacy &
Security → Microphone" message.

### Fallback if the webview route isn't viable

If WKWebView capture can't be made to work reliably, a native recorder
is fine instead:

```
desktop.audio.startRecording(): Promise<void>
desktop.audio.pauseRecording() / resumeRecording(): Promise<void>
desktop.audio.stopRecording(): Promise<{ reference: string; durationMs: number }>
desktop.audio.level(): Promise<number>   // 0–1, polled for a live meter
```

The reference would be a `desktop.files` reference, so `url()`,
`read()` and `delete()` keep working on it.

## What mneme will do with it

A recorder in the page editor (record, pause, resume, stop, live
duration). It saves the audio with `desktop.files.write`, adds a row to a
new `recording` table linked to the page, and inserts an audio block
that plays it back through `files.url()`. Phase 17 (request 19)
transcribes these recordings.

## Please update in mneme when done

Update mneme's `@chain/sdk` (file link) and note any `lib.rs` /
`tauri.conf.json` template change for `chain update`. Say what config
key mneme should set, update the relevant CONTRACT.md, then signal
mneme's session (`mneme-0e`).
