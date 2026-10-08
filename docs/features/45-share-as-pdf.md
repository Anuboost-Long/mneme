# Share as PDF

Source: the user, 8 October 2026: "what if I want to share summary or
flash card to friends … when sharing flash card or summary it will
generate proper pdf to send."

## Status

Built 8 October 2026 on chain-sdk's `desktop.pdf` (request 41) and
`desktop.share` (request 42). Checked in the dev build: a 7-page
revision notes page, a 20-page chapter with images and tables, and a
75-card deck (13 pages, no card split) rendered and looked right; the
share menu opened under the button with AirDrop, Mail and Messages.
Not yet checked: sending through a real service, and the save-sheet
fallback (the share menu is always available on macOS).

**Changed from the plan:**

- Share as PDF is a button in the page's and the deck's header row,
  not a menu item, beside the other actions there.
- Errors show inline under the header, like the Done error, not as a
  toast.
- The save-sheet fallback doesn't reveal the file: `files.reveal` only
  works on references, not on the saved copy.
- Khmer, Arabic and Devanagari text looks right and selects, but
  copying or searching it gives wrong characters. That's the macOS PDF
  writer (`availability().complexScriptSearch` is false), not something
  mneme or chain-sdk can fix. Latin and Chinese search fine.
- The file name drops characters macOS can't use: "Revision notes:
  Module 4" arrives as "Revision notes- Module 4.pdf".
- Page numbers use chain's footer option ("Made with mneme" left,
  "Page n of N" right); WebKit has no `@page` margin boxes.

## Goal

A student can send a friend their summary, revision notes, any page or
a flashcard deck as a PDF that looks right in Preview, on a phone and
printed, without the friend having mneme.

## Behaviour

- **Share as PDF…** on:
  - a page, from the page's menu. Summaries and revision notes from
    Prepare module are pages (`module_prep.summary_page_id`,
    `notes_page_id`), so this covers them and every lecture page.
  - a flashcard deck, from the deck's menu on `FlashcardsPage`.
- Choosing it makes the PDF, then opens the system share menu
  (AirDrop, Messages, Mail, Save to Files…) anchored to the button. The
  button reads "Sharing…" until the menu closes. If the share menu isn't
  available, it falls back to the save sheet (`desktop.files.save`).
  The PDF in the app's files is deleted once the menu closes; chain
  keeps its own copy for the service.
- File name: the page title or `<Module> flashcards`, made safe for a
  file name, with `.pdf`.

### What the PDF looks like

- A4 or Letter, from the Mac's region, with even margins. Light theme
  always, whatever the app's theme.
- Header on the first page: the title, then `Course · Module` and the
  date in small muted text. A footer on every page: `Page n of N` and
  "Made with mneme".
- **Page**: the page's content as it reads in the editor: headings,
  lists, task lists, tables, highlights, code, toggles opened, images.
  AI blocks print their output, never their controls. Headings don't sit
  alone at the bottom of a page, and table rows and images aren't split
  across pages.
- **Flashcard deck**: numbered cards, front in bold, back below it,
  a divider between cards; a card never splits across pages. Cards from
  a page show that page's title in muted text. Study progress (due
  dates, right/wrong counts) is never included.
- Text stays text: selectable, searchable, and any script the app shows
  (Khmer, Chinese, Arabic, maths symbols) renders as it does on screen.

### Errors

- An empty page or deck: the menu item is disabled with the reason
  ("This deck has no cards yet").
- The PDF can't be made: a toast saying what failed and to try again;
  nothing half-written is left on disk.

## Source

- `src/features/share/lib/pdf.ts` — `pagePdfHtml` (opens toggles, adds
  image captions, lists attachments/recordings/videos by name),
  `deckPdfHtml`, `sharePdf` (render, share or save, delete) and
  `sharePdfError`.
- `src/features/share/lib/printDocument.ts` — the print document and
  its stylesheet (light colours, break rules, header).
- `src/features/share/components/SharePdfButton.tsx` — the button.
- Used in `src/features/courses/pages/PageDetailPage.tsx` and
  `src/features/flashcards/pages/FlashcardsPage.tsx`.
- Guide topic `share-pdf` in `src/features/guide/lib/topics.ts`.

## Depends on

- chain-sdk request 41 — `desktop.pdf.render`.
- chain-sdk request 42 — `desktop.share.show`.
- Existing: `desktop.files.read`/`save`/`delete`.

## Acceptance

- [x] Revision notes and a chapter with headings, tables and images
      export to a PDF that matches the editor.
- [x] Text in the PDF is selectable and searchable (Latin). Khmer is
      selectable but not searchable on macOS (see above).
- [x] A 75-card deck exports with no card split across pages and the
      right page count in the footer.
- [x] Dark theme in the app still gives a light PDF.
- [x] The share menu opens under the button. Sending through a service
      still needs a person to try.
- [x] Empty page/deck: the button is disabled with its reason.
