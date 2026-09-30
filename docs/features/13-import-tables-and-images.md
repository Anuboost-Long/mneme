# Import: tables and images

Roadmap Phases 13 (File Import) and 14 (Image Support). The user asked
for import to be "more attentive to tables and images": an image in a
document should arrive as a picture, and a table as a table.

Tables arrive as editor tables (the TipTap table extension), the rich-text
form of a markdown table, since pages are stored as HTML.

## Where each format stands

| Format   | Tables                               | Images                                |
| -------- | ------------------------------------ | ------------------------------------- |
| Markdown | Already tables (marked, GFM)         | Relative paths can't be read — skipped |
| DOCX     | Already tables (mammoth)             | Check they survive sanitizing          |
| PDF      | Flattened into lines — **the gap**   | Dropped — **the gap**                  |

## Plan

1. **PDF images (no Chain change).** Use pdf.js's operator list to find
   each painted image and its transform on the page, render the page to
   a canvas, crop each image's box to PNG, and store it the way pasted
   images are stored (`page-image.ts`), inserted at its reading position
   among the text blocks.
2. **PDF tables (Chain request 23).** Render each page to PNG and call
   `desktop.vision.recognizeDocument`. Turn each table into `<table>`
   (with a header row when the first row looks like one), and drop the
   text-layer lines that fall inside a table's box so the table isn't
   repeated as loose text.
3. **Scanned PDF pages** (no text layer): use `recognizeDocument`'s
   paragraphs and tables for the whole page.
4. **Fallback** when `recognizeDocument` is `UNSUPPORTED` (macOS before
   26, Windows): today's text import, plus the images from step 1.
5. **Images of tables** in a page: an "Extract table" action beside
   "Extract text" (Phase 15), inserting the table below the image.

## Status (29 September 2026)

All five steps are in. Verified in the app: a Chrome-printed PDF with a
ruled table imports as title, paragraph, table, paragraph; images crop
from PDFs and land between the right paragraphs; "Extract table" reads a
table screenshot cell for cell. DOCX images, which the sanitizer used to
drop, are now stored as files too.

Columns only a few pixels apart used to merge cells; chain-sdk fixed that
in chain-core (words are reassigned to the cell they sit in). Not yet
tried: borderless tables, row spans, a real scanned PDF.
