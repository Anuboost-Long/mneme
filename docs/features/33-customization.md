# Phase 33 — Customization

## Status — 5 October 2026

**Done.** Run in the dev build: the accent choices restyle the app at
once and survive a reload (Ocean, Iris and Rose seen), Layout, Reading
and Page types show in Settings → General, and migration 0036 applied.
Tests: `tests/theme.test.mjs` (restoring choices before the first
paint, and a broken saved value leaving the theme alone),
`tests/page-types.test.mjs` (names, labels, pickers, deleting, backups).
Checked in the app by the user on 6 October 2026, including the
picture-card settings.

## Goal

Let the student make mneme comfortable to read and work in, and
describe their own kinds of pages.

## How it works

Already there: light and dark mode, 122 icons, covers, course colours,
custom module icons.

### Appearance (Settings → General, saved on this device)

| Setting | Choices | Applies to |
|---|---|---|
| Accent colour | mneme (default), Ocean, Fern, Iris, Ochre, Rose | Buttons and selections; each has a light-mode and a dark-mode shade so text on it stays readable |
| Sidebar width | Narrow, Standard (default), Wide | The sidebar |
| Page width | Full (default), Wide, Readable | A page's text and blocks |
| Page font | Avenir Next (default), System, Serif, Rounded | A page's text; all are already on the device |
| Text size | Small, Standard (default), Large, Extra large | A page's text, headings included |
| Compact mode | Off (default) / On | The whole app: tighter spacing and slightly smaller text |

Saved in `localStorage` like the theme, applied as CSS variables on
`<html>` before the first paint. Each choice is a card with a small picture of
it, like the Colour theme cards (`settings/components/OptionCards.tsx`):
sidebar and page width as mini layouts, Comfortable and Compact density,
each font's “Ag” drawn in that font, and each text size's “Aa” at its
size. The font and size rules match any element with
`data-page-font`/`data-text-size`, so a preview card draws with the
same CSS as the pages.

The accent sets two tokens: `--action` (buttons and selections, a
light-mode and a dark-mode shade) and `--accent` (lime by default: the
top bar's line, progress bars, Done ticks, status pills, highlights,
read-aloud and playback sliders, filter dots). Every place that used
`chain-lime` directly now uses `accent`; `chain-lime` stays only as the
brand colour, in the app icon.

### Custom page types (Settings → General → Page types)

- Add, rename and delete your own page types ("Lab report", "Case
  study"). They're listed in every Type picker after the built-in ones,
  and used by grouping, sorting and filters like any type.
- A custom type is stored in `page.type` as 100 + its id, so nothing
  else about pages changes. Its name comes from the `page_type` table
  (migration 0036).
- Deleting a custom type asks first, then turns its pages into
  "Custom".
- Backups include custom page types, restored before pages.

## Source locations

- `src/shared/providers/AppearanceProvider.tsx`,
  `src/shared/lib/appearance.ts` — the choices and applying them.
- `src/App.css` — the variables they set.
- `src/features/courses/lib/page-type/` — custom types;
  `usePageTypes()` gives every picker and label the full list.
- `src/features/settings/pages/SettingsPage.tsx` — the controls.

## Acceptance criteria

- Each appearance choice changes the app at once and survives a restart.
- A custom type can be picked for a page, shows on its card and header,
  groups and filters, and survives a backup and restore.
- Deleting a custom type turns its pages into Custom.
