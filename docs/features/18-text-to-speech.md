# Phase 18 — Text-to-Speech

Listen to learning material: a selection, a whole page, or a module's
summary.

## Status — 28 September 2026

**Implemented, with no chain-sdk change.** Typecheck and web build pass.
A WKWebView probe on this Mac confirmed `speechSynthesis` and
`SpeechSynthesisUtterance` exist, and that 68 system voices arrive
through `voiceschanged`, not on the first `getVoices()`. It hasn't been
listened to end to end in the native app yet.

## What it does

- **Read a selection:** right-click a selection, then "Read aloud" (at
  the bottom of the selection menu; ↓ from the last row of format
  buttons reaches it).
- **Read the whole page:** "Listen" on the page header reads the title,
  then each block.
- **Read the module summary:** "Listen" on the module header reads the
  module name and its description. It's shown only when the module has
  a description.
- **Player** (a bar at the bottom of the window): play/pause, previous
  and next paragraph, "Reading · 3 of 12", and stop. "1× · Voice" opens
  speed (0.75×–2×), language and voice. Choosing a language picks that
  language's default voice. Speed and voice are remembered per device
  (`localStorage`) and take effect immediately, restarting the current
  paragraph. The first voice defaults to the saved one, then the
  system's voice for `navigator.language`.
- Leaving the page or module stops reading.

## How

- `features/read-aloud/lib/useReadAloud.ts` speaks one utterance per
  chunk, because WebKit and Chromium stall or cut off very long
  utterances. A session counter drops `onend` callbacks from cancelled
  utterances, so skipping or stopping never jumps twice.
- `features/read-aloud/lib/readableText.ts` turns HTML into the
  innermost blocks (`p`, headings, `li`, `pre`, table cells…), so a list
  item isn't read twice through its inner `<p>`. Plain text is split on
  newlines.
- The page's "Listen" reads the saved content (`page.content`), so edits
  from the last ~0.8 s, before autosave, aren't included.

## Deferred

- Highlighting or scrolling to the paragraph being read.
- An AI-generated module summary to read. Today it reads the module's
  own description, and there's no stored summary yet.
- Listening that continues across navigation.
