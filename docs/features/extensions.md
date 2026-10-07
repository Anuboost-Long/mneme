# Extensions — downloadable open-source models

Keep the app small. Offer open-source voices and speech models as
optional downloads that mneme installs and configures itself.

## Status — 28 September 2026

**Transcription models: implemented** on request 21 part 1
(`desktop.models` plus model-based `desktop.speech.transcribe`), macOS
arm64. Typecheck and web build pass. chain-sdk verified install, cancel,
integrity checks and a 60-minute transcription with Moonshine Tiny in its
playground. **Not yet downloaded or transcribed from mneme's own UI.**
**Voices: implemented** on request 21 part 2 (`desktop.tts`), with
mneme opted into GPL via `package.json` → `"chain": { "gpl": true }`.
**Consequence:** distributed builds contain GPL-3 code (espeak-ng), so
mneme must be released under GPL-3-compatible terms, with complete
corresponding source. Typecheck and web build pass. **Not yet listened
to from mneme's own UI.**

## As built

- `features/extensions/lib/catalog.ts`: four transcription models, all
  MIT. Each has a URL and SHA-256 pinned from sherpa-onnx's
  `asr-models` release (Whisper's hashes computed locally, since that
  release publishes none for them), and file names checked by listing
  each archive.
  - Moonshine Tiny (English), 30 MB.
  - Moonshine Base (English), 111 MB.
  - Whisper Base (multilingual), 208 MB.
  - Whisper Small (multilingual), 639 MB.
    Silero VAD (MIT, 0.6 MB) installs with the first model and is removed
    with the last.
- **Left out after checking licenses:** non-English Moonshine models are
  under the Moonshine Community License, which is non-commercial.
  SenseVoice is left out until the license of its converted weights is
  confirmed.
- `extensionsState.ts` is a module-level store (downloads keep running
  if you leave Settings) holding installed models, per-model progress
  and errors. It maps `INTEGRITY_FAILED` and `UNAVAILABLE` to plain
  messages.
- **Settings → Extensions** (`#extensions`): each model's name, what
  it's good for, its size and license link, then Download, a progress bar
  with Cancel, and Remove. Disk space used is shown at the top.
- **Transcribe:** when a model is installed, an "Engine" picker appears
  ("Built into this device" or a model). Moonshine offers English only.
  Whisper offers "Detect automatically" plus common languages, including
  Khmer, Thai and Vietnamese. The last engine used is remembered. With no
  built-in engine (Windows) and no model, the panel links to Settings →
  Extensions.
- The recorder now asks for AAC/MP4 wherever the webview supports it,
  because the model engine's decoder can't read Opus (WebView2's
  default).
- **Voices:** Kokoro multi-lang v1.0 (Apache-2.0, 350 MB) with 54
  speakers. Their language comes from the name prefix (a = US, b = GB,
  e = es, f = fr, h = hi, i = it, j = ja, p = pt-BR, z = zh). Piper
  voices are left out until each voice's dataset license is checked.
  Amy's model card only says "see URL".
- **Listen with a downloaded voice** (`read-aloud/lib/downloadedVoicePlayer.ts`):
  a background pipeline, rebuilt after "not a good experience" feedback
  on the first per-paragraph `<audio>` version, which paused between
  paragraphs and before the first sound.
  - Paragraphs are split into sentences (`Intl.Segmenter` in the voice's
    language, with pieces under 40 characters merged into the next), so
    the first sound comes after one short sentence.
  - Synthesis keeps 6 sentences ahead of playback, each decoded to an
    `AudioBuffer`. Playback starts (or restarts after running dry) only
    once 2 are ready, so it never plays one clip and then stalls. WAVs are deleted as soon as they're decoded.
  - Pieces are scheduled back to back on one `AudioContext`, so there's
    no gap and no per-piece loading. Pause and resume suspend and resume
    the context.
  - When the chosen voice is a downloaded one, its model loads in the
    background shortly after a page opens (`desktop.tts.voices`), so
    Listen doesn't wait for it.
  - The bar still counts paragraphs, driven by the player's events. It
    shows "Preparing voice…" only when a wait lasts over 0.5 s, so quick
    preparations don't flash the label.
  - Skipping, or changing speed or voice, starts a new run from the
    current paragraph.
    Downloaded voices are marked "(downloaded)" in the voice picker.
- **Only use downloaded** (per device): once something in a group is
  downloaded, a checkbox hides this device's own voices (Listen) or
  built-in engine (Transcribe). The device option comes back by itself
  if every download in that group is removed.
- `THIRD_PARTY_NOTICES.md` lists the bundled engine's components. Their
  full license texts still need to be shown inside the app.

## Principles

- **Ship built-in, download optional.** Without extensions, mneme uses
  the OS: system voices for read-aloud, Vision for OCR, SpeechAnalyzer
  for transcription. Nothing downloads until the user chooses an
  extension.
- **Extensions are models, never code.** The engine (sherpa-onnx,
  Apache-2.0) ships in the build. Downloads are data only: ONNX weights,
  tokens and voice files. macOS won't load native code the app
  downloaded later without extra signing work, and data can be pinned to
  a checksum.
- **mneme curates the catalog.** A reviewed list lives in the repo
  (`features/extensions/catalog.ts`). Each entry has an id, kind, name,
  languages, size, license, source URL, SHA-256, and the engine config
  that wires it up. chain-sdk installs whatever manifest it's given and
  knows nothing about mneme's list.
- **Open source only, with the license shown.** Include only licenses
  that allow commercial use (Apache-2.0, MIT, CC-BY), and show each
  item's license. Non-commercial weights (XTTS, F5-TTS) are out.
- **"We configure it for them":** installing an extension is the whole
  setup. Its voices or languages appear in the existing pickers
  straight away, with no paths or settings to fill in.

## First catalog (to verify before listing)

| Kind          | Candidate                   | Why                                                                |
| ------------- | --------------------------- | ------------------------------------------------------------------ |
| Voice         | Kokoro-82M (multi-language) | Best quality for its size, Apache-2.0                              |
| Voice         | Piper voices, per language  | Small, many languages. Check each voice's license                  |
| Voice         | Kitten TTS                  | Tiny English option                                                |
| Transcription | Whisper (base / small)      | Many languages. Gives Windows transcription, which the OS can't do |
| Transcription | SenseVoice                  | Fast, zh/en/ja/ko/yue                                              |
| Transcription | Moonshine                   | Small, fast English                                                |

Sources are the model releases sherpa-onnx publishes. Pin each URL and
SHA-256 when the catalog is written.

**License check before shipping:** Kokoro/Piper phonemization in
sherpa-onnx goes through espeak-ng, which is GPL-3. That needs resolving
first: link it dynamically, use a non-GPL phonemizer (such as misaki for
Kokoro's English), or accept GPL for that piece. Flagged in request 21.

## mneme's side (once request 21 lands)

- **Settings → Extensions:** grouped by kind (Voices, Transcription).
  Each row shows name, languages, size, license and a Download button,
  then progress with Cancel, then Installed with Remove. The total disk
  space used is shown at the top.
- **Read-aloud:** installed voices join the voice picker, labeled
  "Downloaded". `useReadAloud` sends system voices to `speechSynthesis`
  and downloaded ones to `desktop.tts`.
- **Transcribe:** the language picker adds an engine choice (System or
  an installed model) whenever a model is installed. On Windows, where
  the system engine is unsupported, only installed models show, and the
  empty state links to Extensions.
- Removing an extension falls back to the system engine and never
  deletes transcripts or audio.
