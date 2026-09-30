# Capability Request 23 — Tables in images and PDF pages

> **Shipped 29 September 2026:** `desktop.vision.recognizeDocument(image,
> { languages? })` → paragraphs, tables (HTML-style rowSpan/colSpan) and
> lists; UNSUPPORTED before macOS 26 and on Windows. See chain-sdk
> `agent-docs/capabilities/vision/CONTRACT.md`.

Source: the user asked for import to be "more attentive to tables and
images": an image in a document should arrive as a picture, and a table
as a table rather than loose lines. See
`docs/features/13-import-tables-and-images.md`.

## Why mneme can't do this today

- PDF import reads pdf.js's text layer. A text layer has no notion of a
  table: cells arrive as positioned runs, and mneme flattens them into
  lines. Guessing columns from x positions breaks on wrapped cells,
  merged cells and ragged columns.
- A scanned PDF page or a photo of a table has no text layer at all.
  `desktop.vision.recognizeText` returns lines with boxes, but not which
  lines form a table, its rows, or its cells.

mneme can render any PDF page (or region) to PNG bytes itself with pdf.js,
so the missing piece is only native structure recognition on an image.

## What's asked for

An extension of the vision capability, same input as `recognizeText`:

```
desktop.vision.recognizeDocument(
  image: Uint8Array,
  options?: { languages?: string[] }
): Promise<{
  /** Everything outside tables, in reading order. */
  paragraphs: { text: string; box: Box }[];
  tables: {
    box: Box;
    /** rows[r][c]; a merged cell repeats its text in each slot it spans,
        or (preferred) carries rowSpan/colSpan and is omitted from the slots
        it covers — whichever the native API reports faithfully. */
    rows: { text: string; box: Box; rowSpan?: number; colSpan?: number }[][];
  }[];
}>
```

`Box` as in `recognizeText`: normalized 0–1, top-left origin.

On macOS this looks like Vision's `RecognizeDocumentsRequest` (macOS 26),
whose `DocumentObservation` already exposes tables with rows and cells,
paragraphs and lists. Lists would be welcome too (`lists: { items:
string[]; box }[]`) if they come for free; paragraphs and tables are the
must-haves.

## Errors

- `UNSUPPORTED` — no document recognizer on this OS (macOS before 26,
  Windows for now). mneme then keeps today's behaviour: flattened text,
  or `recognizeText` for scanned pages.
- `INVALID_ARGUMENT` — bytes aren't a decodable image.
- An image with no text resolves empty lists, not an error, like
  `recognizeText`.

## What mneme will do with it

PDF import renders each page to PNG, asks `recognizeDocument`, and turns
each table into an editor table (the TipTap table extension is already
in), with the page's text-layer text used for the paragraphs where it
exists. Pasted or imported images of tables get an "Extract table"
action beside "Extract text". Images inside a PDF are cropped from the
rendered page and inserted as pictures (pdf.js, no Chain change).

## Please update in mneme when done

Update mneme's `@chain/sdk` and any `.chain/native` template change for
`chain update`, update the vision CONTRACT.md, then signal mneme's
session (`mneme-c6`).
