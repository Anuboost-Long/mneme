# Phase 32 — Keyboard shortcuts

## What it does

Seven app-wide shortcuts, each changeable in **Settings → Keyboard**:

| Action | Default (macOS) | Default (Windows) |
|---|---|---|
| Open the command palette | ⌘P | Ctrl+P |
| New page in this module | ⌘N | Ctrl+N |
| Find in page | ⌘F | Ctrl+F |
| Save the page now | ⌘S | Ctrl+S |
| Show or hide the sidebar | ⌘\ | Ctrl+\ |
| Show or hide agent chat | ⌘⇧A | Ctrl+Shift+A |
| Open settings | ⌘, | Ctrl+, |

"New page" runs the module screen's own `module-new-page` palette command,
so it does nothing outside a module.

## How it works

- `shared/lib/shortcuts/types.ts` — the shortcut list and defaults,
  `comboFromEvent` (reads the physical key, so ⌥ letters and ⇧ digits stay
  stable), `formatCombo`, and `shortcutProblem`, which refuses a combo with
  no ⌘/⌃/⌥ (or Ctrl/Alt), one the editor or system already uses, or one
  another shortcut has.
- `shared/lib/shortcuts/actions.ts` — only changed shortcuts are saved, as
  JSON under the `keyboard.shortcuts` setting.
- `shared/lib/shortcuts/shortcutsState.ts` — a Jotai atom of the changes,
  `useShortcuts()` for Settings, and `useShortcut(id, run)` for screens; a
  change applies everywhere at once. RootLayout loads the saved changes at
  startup.
- Settings records the next key press in the capture phase and stops it, so
  recording ⌘P doesn't also open the palette. Esc cancels; Tab still moves
  focus.

## Adding a shortcut

Add an entry to `shortcuts` in `types.ts` and call `useShortcut` where the
action lives. Settings lists it automatically.
