# Capability Request 19 — On-device speech-to-text for a stored recording

> **Shipped 28 September 2026:** `desktop.speech.transcribe`, `cancel()`
> and `locales()`, macOS only. mneme needs `chain update`, which raises
> the minimum to macOS 12. See chain-sdk
> `agent-docs/capabilities/speech/CONTRACT.md`.

Source: roadmap Phase 17 (Speech-to-Text): "Recording → Transcription
→ Raw Transcript → AI Cleanup → Study Notes." See
`docs/features/17-speech-to-text.md`. It depends on request 18, which
produces the recordings.

## Why mneme can't do this today

Nothing in the webview transcribes audio. The Web Speech API's
`SpeechRecognition` is live-microphone only and absent in WKWebView,
and it can't take a file. mneme's AI route (agent CLIs through
`processRunner`) doesn't accept audio either. mneme is committed to
never sending data to a model provider itself or holding an API key, so
a cloud STT call from the webview is out as well. That leaves the OS's
on-device recognizer, which only native code can reach.

## What's asked for

A `speech` capability that transcribes a file already stored through
`desktop.files`. The source is a reference, not bytes: a one-hour
lecture is tens of MB, too much to shuttle over IPC.

```
desktop.speech.transcribe(
  reference: string,
  options?: { locale?: string },            // BCP-47, e.g. "en-US"; default = system locale
  onProgress?: (fraction: number) => void,  // 0–1, best effort
): Promise<Transcript>

desktop.speech.cancel(): Promise<void>      // aborts the running transcribe; it rejects CANCELLED
desktop.speech.locales(): Promise<string[]> // locales usable on-device right now

interface Transcript {
  text: string;
  segments: { startMs: number; endMs: number; text: string }[];
  locale: string;
}
```

- **On-device only.** On macOS 26 that's `SpeechAnalyzer` +
  `SpeechTranscriber`, which handles long-form audio. On older macOS,
  use `SFSpeechRecognizer` with `requiresOnDeviceRecognition = true`.
  Never fall back to Apple's server recognition: a student's lecture
  audio must not leave the machine unasked. Windows/Linux may reject
  with `UNSUPPORTED` for now.
- Input formats: whatever request 18's recorder produces (`audio/mp4`
  AAC on macOS). Also accept m4a, mp3 and wav, since users may add
  existing lecture files later.
- Must handle recordings of an hour or more: chunk natively if the
  engine needs it, and keep segment timestamps continuous.
- Permission: emit `NSSpeechRecognitionUsageDescription` when the app
  declares the capability, as with request 18's declaration.
- One transcription at a time. A second call while one runs rejects
  `UNAVAILABLE`.
- Errors: `NOT_FOUND` for a bad reference, `UNSUPPORTED` when no
  on-device model exists for the locale, with the message naming the
  locale (a missing macOS language asset should say it needs
  downloading, and triggering that download is welcome if the API
  allows it), `PERMISSION_DENIED` when the user refused, `CANCELLED`
  after `cancel()`, and `NATIVE_FAILURE` with the OS message otherwise.

## What mneme will do with it

It adds a "Transcribe" action on a recording block, shows progress with
a Cancel button, and saves the raw transcript and segments on the
`recording` row. The transcript is shown for editing, then can be
inserted into the page with timestamps. "Clean transcript" and
"Summarize transcript" then run through mneme's existing AI actions
(agent CLIs), since those are just text.

## Please update in mneme when done

Update mneme's `@chain/sdk` (file link), note any template change for
`chain update`, add a CONTRACT.md, then signal mneme's session
(`mneme-0e`).
