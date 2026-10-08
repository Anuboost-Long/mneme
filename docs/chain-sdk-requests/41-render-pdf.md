# Capability Request 41 — Render a page to a PDF file

Source: mneme's Share as PDF (`docs/features/45-share-as-pdf.md`).
Students send a summary, revision notes or a flashcard deck to a friend
as a PDF.

## The problem

mneme has the content as HTML and its own print stylesheet, but no way
to turn it into a real PDF:

- JavaScript PDF libraries (jsPDF, pdf-lib) lay text out themselves.
  They can't shape complex scripts (Khmer, Arabic, Devanagari), don't
  render the app's HTML (tables, lists, highlights), and need fonts
  embedded by hand.
- html2canvas-style capture produces pictures of text: not selectable,
  not searchable, blurry when printed, and large.
- `window.print()` opens the print dialog over the whole app window,
  prints the app's chrome, and makes the user find "Save as PDF"
  themselves.

The webview the app already runs in lays this content out correctly
with system fonts. mneme needs that engine to write a PDF file, without
calling Tauri or WebKit itself.

## What's asked for

The exact shape is chain-sdk's contract decision. Each item is a
requirement, an option with a documented default where it's a setting.

### Input

- **An HTML document as a string**, rendered off-screen. It never
  appears in, or disturbs, the app window.
- It can load the app's own local files (images saved through
  `desktop.files`, the asset-protocol URLs the app already uses) and the
  app's bundled CSS/fonts. It doesn't run the app's scripts unless
  asked.
- **Wait for it to be ready**: images and web fonts loaded before the
  PDF is made, with a timeout (documented default) after which it
  fails with a clear error rather than writing a half-rendered file.

### Pagination and layout

- **Real pages**, not one tall page: the CSS paged-media rules the
  engine supports apply (`@page` size and margins, `break-before`,
  `break-inside: avoid`, `break-after: avoid`).
- **Paper size**: A4, Letter, or a custom width × height, with the
  default taken from the system's region (A4 / Letter).
- **Margins**: settable, documented default. CSS `@page` margins win
  when the document sets them.
- **Orientation**: portrait (default) or landscape.
- **Background colours and images printed** (on by default), so
  highlights and table shading survive.
- **Header and footer** with page numbers: either through CSS
  (`counter(page)`/`counter(pages)` in `@page` margin boxes, if the
  engine supports them), or as options taking left/centre/right text
  with `{page}` and `{pages}` placeholders. Which one is chain-sdk's
  call; mneme needs "Page n of N" on every page.
- **Colour scheme forced to light** for the render (on by default), so
  a dark-mode app still gets a printable PDF.

### Output

- **Write to a path the app owns** (its files area or a temp path
  chain provides) and return the path, page count and byte size. Or
  return the bytes, so the app can hand them to `desktop.files.save`.
  Ideally both.
- **Text stays text**: selectable and searchable, fonts embedded, links
  clickable.
- **Document metadata**: title and author/creator settable.
- Nothing half-written is left behind on failure.

### Errors and availability

- Rejects with a readable message and a code (timeout, a resource that
  failed to load, can't write the path, unsupported on this platform).
- `availability()` reports whether PDF rendering works here, plus which
  of the options above are supported, so an app can disable the menu
  item instead of failing.

## Platforms

macOS first (mneme's only target today). Windows later, same contract.

## Not asked for

- Showing a print dialog or printing to a printer.
- Editing or reading existing PDFs.
