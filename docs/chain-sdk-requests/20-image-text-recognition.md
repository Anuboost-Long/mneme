# Capability Request 20 — On-device text recognition (OCR) for an image

> **Shipped 28 September 2026:** `desktop.vision.recognizeText` and
> `languages()`, as specified. mneme needs `chain update`. See chain-sdk
> `agent-docs/capabilities/vision/CONTRACT.md`.

Source: roadmap Phase 15 (OCR): "Turn text inside images into editable
page content: Screenshot → OCR → Editable Text." See
`docs/features/15-ocr.md`.

## Why mneme can't do this today

The webview has no text recognition API. The Shape Detection API's
`TextDetector` is not shipped in WKWebView. A WASM Tesseract would add
~10 MB of language data and read handwriting and slide photos poorly. The
agent CLIs can describe an image, but that route is an AI answer, not
faithful extraction: it paraphrases, and it needs an agent installed.
Students paste slide screenshots and textbook photos, and they need the
exact text. The OS already has a good offline engine (Vision on macOS,
`Windows.Media.Ocr` on Windows), and only native code can reach it.

## What's asked for

```
desktop.vision.recognizeText(
  image: Uint8Array,
  options?: { languages?: string[]; accurate?: boolean },  // BCP-47; accurate defaults true
): Promise<RecognizedText>

desktop.vision.languages(): Promise<string[]>

interface RecognizedText {
  text: string;   // lines joined in reading order, "\n" between lines
  lines: {
    text: string;
    confidence: number;                                    // 0–1
    box: { x: number; y: number; width: number; height: number };  // normalized 0–1, top-left origin
  }[];
}
```

- The input is **bytes, not a reference.** Page images are shown by
  `files.url()` and mneme can fetch them. Chat and clipboard images are
  never stored. Images are capped at 10 MB, so IPC size isn't a concern.
  Accept PNG, JPEG, WebP, GIF (first frame) and HEIC.
- macOS: `VNRecognizeTextRequest` with `.accurate`,
  `usesLanguageCorrection = true`, and `automaticallyDetectsLanguage`
  when `languages` is omitted. Or macOS 26's `RecognizeDocumentsRequest`
  if it gives better reading order on slides; your call.
- Windows: `Windows.Media.Ocr` is welcome. `UNSUPPORTED` elsewhere is
  fine for now.
- An image with no text resolves `{ text: "", lines: [] }`, not an
  error.
- Errors: `INVALID_ARGUMENT` for undecodable bytes, `UNSUPPORTED` for an
  unavailable language, and `NATIVE_FAILURE` with the OS message.
- No permission prompt should be needed. Vision is local.

## What mneme will do with it

Adds an "Extract text" item to the image block's menu. A preview dialog
shows the recognized text in an editable field, with low-confidence
lines marked. Users can "Insert below image", "Replace image" or "Ask
AI" (it goes into the chat composer as text). The chat composer can
also offer "Extract text" on an attached image.

## Please update in mneme when done

Update mneme's `@chain/sdk` (file link), note any template change for
`chain update`, add a CONTRACT.md, then signal mneme's session
(`mneme-0e`).
