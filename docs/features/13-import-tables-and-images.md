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

## Reading book chapters (5 October 2026)

A chapter exported from an e-book library (BCS's *Cyber Security*, via
a university's ebook site) imported with page numbers, alternating
running headers, the library's watermark and a sideways copyright line
mixed into the text; bullets as the letter "y"; its bold headings as
plain paragraphs; paragraphs cut in two at every page break; and
footnotes as numbered lists in mid-text. This is about how a PDF's
layout is read (this phase), not Phase 12's content detection.

What the PDF importer does now (`src/features/courses/lib/pdf-structure.ts`,
fonts and the visible area from `src/shared/lib/pdf.ts`):

- Text outside the page's visible area, and sideways text on an
  upright page, is left out.
- Running headers and footers are the lines nearest the top and bottom
  edges, by position, that repeat on most pages, or on most odd or
  most even pages. A lone page number at an edge ("74", "Page 3 of 6",
  "xii") is dropped on any page.
- A one-character bullet from a symbol font (Wingdings, Symbol,
  ZapfDingbats) is a bullet.
- A short bold line standing on its own is a heading, as well as
  larger text. Heading levels follow the document's own heading styles:
  bigger first, then capitals, then upright before italic.
- When the biggest heading style appears once, on the first page, it is
  the page's title instead of a heading. Otherwise the title is the
  PDF's own title, unless that is a placeholder, and then the file name.
- A paragraph or list item that runs onto the next page continues there
  instead of breaking.
- Small numbered lines at the bottom of a page are footnotes. They are
  gathered under **Notes** at the end, with their links clickable, and
  the small raised number in the text reads as `[1]`.
- A numbered list split by a paragraph carries on from its own number
  (`<ol start="2">`) instead of starting again at 1.

Checked against the chapter itself (23 pages: no page numbers, headers
or stamps left; 49 headings on three levels; 39 footnotes under Notes)
and an assessment brief (its "Page 1 of 6" footer gone).
`tests/pdf-import.test.mjs` covers each rule above.

Known limits: without document recognition (before macOS 26, Windows),
a table's bold header cells can read as headings. Footnotes numbered
from 1 on every page keep their repeated numbers. Not yet tried in the
running app.

