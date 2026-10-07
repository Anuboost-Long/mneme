# Phase 30 — Search

## Status — 5 October 2026

**Done**, on chain-sdk's `desktop.embeddings` (request 37). Run in the
dev build: BGE Small downloaded from Settings → Extensions, the 37 pages
indexed on their own (about two and a half minutes in the debug build),
and ⌘P “why do people hack” listed the cyber threats chapter first under
By meaning, then the other cyber-attack chapters. The
`search_by_meaning` tool returned the closest passages for “what makes
someone attack a company”. Tests: `tests/search.test.mjs`,
`search-passages.test.mjs`, `search-index.test.mjs`. E5 hasn't been
tried in the app.

- ⌘P finds courses, modules, page titles, page content and, now,
  attachments by file name. Each attachment result opens the page it's
  on ("On “Threats”"); attachments on deleted pages aren't found.
  `tests/search.test.mjs`.
- Transcripts are searched on the Recordings screen; Find in page (⌘F)
  highlights matches; ⌘P → Ask searches with the AI.

## Search by meaning

**Goal.** Find material by what it's about, not the exact words: "why
do people hack" finds the Motives section of the cyber threats chapter.

**How it will work.**

1. **The model.** Settings → Extensions offers a small sentence-embedding
   model to download, through chain-sdk's models capability (request
   37). mneme's catalog lists `multilingual-e5-small` (MIT, about 120 MB,
   many languages) and `bge-small-en-v1.5` (MIT, about 35 MB, English).
   Nothing about search by meaning runs until one is installed.
2. **The index.** Each page is split into passages by its headings and
   paragraphs (up to the model's token limit, counted by the model's
   own tokenizer), embedded on this device, and stored in a new
   `page_passage` table: page, position, text, vector, model. A page is
   re-indexed when it's saved, imported or restored; indexing the
   existing library runs in the background with progress in Settings.
   Changing the model rebuilds the index. Nothing leaves the device.
3. **⌘P.** Typing a question also shows **By meaning**: the passages
   closest to it (cosine similarity, computed in mneme), each opening
   its page, with the passage as the detail. Words results stay first.
4. **The assistant.** A new read tool, `search_by_meaning`, returns the
   closest passages with their pages, so Ask mode finds material it
   wouldn't match by keyword.

**Acceptance.** With a model installed, "why do people hack" lists the
Motives section of the cyber threats page among the first results, the
index updates when a page is saved, and nothing is sent off the device.

As built: the index is the `page_passage` table (migration 0035). Each
page becomes its title plus passages of about 900 characters under its
headings, each starting with the page title and heading. Vectors are
stored as base64 text, because chain-sdk's storage returns BLOBs as
null. A page is re-indexed when its `updated_at` changes, reusing the
vector of any passage whose text is unchanged; the index runs when the
app opens, every two minutes, and when a search model is installed, and
the model is unloaded after indexing. Search skips pages in Recently
deleted. ⌘P asks by meaning once the query has two words or eight
characters, and lists up to five pages not already listed by words.
With both models installed, BGE is used.

## Source locations

- `src/features/courses/lib/attachment/table.ts` — `searchAttachmentLinks`.
- `src/features/search/lib/` — `passages.ts` (splitting),
  `searchIndex.ts` (indexing, ranking, status), `passage/` (the table).
- `src/features/search/components/SearchIndexStatus.tsx`; the search
  models in `src/features/extensions/lib/catalog.ts`.
- `src/app/CommandPalette.tsx` — the Attachments and By meaning groups.
- `src/features/agent-server/lib/tools.ts` — `search_by_meaning`.

## Dependencies

- chain-sdk request 37: `docs/chain-sdk-requests/37-text-embeddings.md`.
