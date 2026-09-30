# Capability Request 21 — Downloadable model extensions, run by a bundled sherpa-onnx engine

> **Part 1 shipped 28 September 2026:** `desktop.models` and model-based
> `desktop.speech.transcribe` (macOS verified; Windows pinned but never
> run). It uses sherpa-onnx's no-TTS static build, so no GPL code, adding
> about 19 MB to the binary. `desktop.tts` is **not built**: every
> sherpa-onnx voice needs espeak-ng (GPL-3), and a GPL-free route is being
> chosen. **Update: the user chose to accept GPL-3 (espeak-ng) for TTS.**
> The decoder has no Opus support. See chain-sdk
> `agent-docs/capabilities/models/CONTRACT.md`.

Source: user direction: "use as many open source as possible, but
instead of shipping everything in the build, make it an extension:
whichever user wants it downloads it and we configure it for them." See
`docs/features/extensions.md`.

## Why mneme can't do this today

- There's no way to download a large file to disk natively with progress,
  checksum and extraction. `http` is a whole-body GET into JS, and
  `files.write` takes whole byte arrays. A 300 MB model through that path
  is not viable.
- There's no engine to run open-source TTS or ASR models. The webview
  route (`kokoro-js`, WASM ONNX) is slow in WKWebView and keeps models in
  the webview cache, outside anything managed.
- Windows has no transcription at all (request 19 ruled out WinRT), and
  a bundled ASR engine fixes that on every OS.

## What's asked for

### 1. `desktop.models`: install, list and remove data-only model packs

The app passes a manifest. chain-sdk knows no catalog.

```
interface ModelManifest {
  id: string;            // app-chosen, [a-z0-9-]+, e.g. "kokoro-82m-v1"
  url: string;           // https only
  sha256: string;        // of the downloaded file; verified before anything is kept
  archive?: "tar.bz2" | "tar.gz" | "zip" | "none";
  sizeBytes?: number;    // for progress when there's no Content-Length
}

install(manifest, onProgress?: (received: number, total: number | null) => void): Promise<InstalledModel>
cancel(id: string): Promise<void>          // install rejects CANCELLED, partial files removed
list(): Promise<InstalledModel[]>
remove(id: string): Promise<void>          // idempotent
interface InstalledModel { id: string; sizeBytes: number; installedAt: string }
```

- Stored under the app-data folder, one directory per id. Paths are
  never returned, following the files contract. Engines receive the
  **id**.
- Download to a temp file, verify SHA-256, extract, then atomically move
  into place. A failed check rejects `INTEGRITY_FAILED` (or reuse an
  existing code) and keeps nothing.
- Resume or retry is welcome but not required. One install per id at a
  time.
- **Never executes anything** it downloads. Reject archives containing
  symlinks or paths escaping the model directory.

### 2. An engine: sherpa-onnx, bundled in the build

sherpa-onnx (k2-fsa, Apache-2.0) runs Kokoro, Piper/VITS, Kitten and
Matcha voices, and Whisper, SenseVoice, Paraformer and Moonshine ASR,
from one runtime. Use its Rust bindings or C API, statically or with the
dylib signed inside the bundle.

**TTS: a new `desktop.tts`**

```
voices(modelId: string, config: TtsModelConfig): Promise<{ id: number; name: string; language?: string }[]>
synthesize(text: string, options: { modelId: string; config: TtsModelConfig; voice?: number; speed?: number }): Promise<string>  // a desktop.files reference to a WAV
```

`TtsModelConfig` says which files inside the model directory are the
model, tokens, voices, lexicon and data dir, as relative names from
mneme's catalog. mneme plays the WAV through `files.url()` and
chunk-queues paragraphs itself, as read-aloud already does. So no
streaming API is needed, but it must be fast enough that a paragraph
synthesizes in well under its own playback time on Apple silicon.

**ASR: extend `desktop.speech.transcribe`**

```
transcribe(reference, { locale?, engine?: { modelId: string; config: AsrModelConfig } }, onProgress?)
```

- Without `engine`, it behaves as today (the system engine).
- With `engine`, it runs sherpa-onnx offline recognition over the file,
  with VAD segmentation (Silero VAD, shipped in the build or installable
  as a model), and returns the same `Transcript` shape with timestamps.
  `cancel()` and the single-job rule are unchanged. This also works on
  Windows and Linux, not only macOS.
- It needs decoding of AAC/m4a (MediaRecorder's output), mp3 and wav to
  16 kHz mono PCM. AVFoundation or Media Foundation is fine, or
  symphonia.

### 3. Licensing: needs a decision before shipping

sherpa-onnx's Piper and Kokoro phonemization goes through espeak-ng
(GPL-3). Please find out exactly what gets linked into the build and
propose a clean option: dynamic linking, a non-GPL phonemizer (misaki
for Kokoro English), or excluding espeak-dependent voices. mneme's
catalog will then only list what the build can legally run.

## What mneme will do with it

- **Settings → Extensions:** a curated catalog (in mneme's repo, with
  pinned URL and SHA-256 per entry) with download, progress, cancel,
  remove and disk use.
- **Read-aloud:** installed voices join the voice picker.
- **Transcribe:** installed ASR models join the engine and language
  choice. On Windows they're the only option.

## Please update in mneme when done

Update mneme's `@chain/sdk` (file link) and note any `lib.rs` template
change for `chain update`. Say whether the engine adds a
`chain.permissions` key (it shouldn't need one) and how much it adds to
the bundle. Add CONTRACT.md files, then signal mneme's session
(`mneme-0e`). Partial ships are welcome, in this order: `models` + ASR
(fixes Windows transcription), then TTS.
