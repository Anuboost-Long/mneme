# Command palette (⌘P)

Side feature, not a roadmap phase. Status 27 September 2026: built and
checked in the running app (open/close, search, keyboard, AI actions
listed on a page). Running an action from the palette hasn't been tried
live yet.

## What it does

⌘P (Ctrl+P on Windows/Linux) opens a Spotlight-style panel anywhere in
mneme:

- **Search:** courses (by name), modules (by name, with their course)
  and pages (by title, then by content, marked "matches content"). Names
  that start with the query come first.
- **AI actions:** on a page, every AI action, run exactly as from that
  page's AI actions menu (selection or whole page, saved "Run with"
  agent, the course's AI profile).
- **Go to:** Home, Courses, Agent chat, Settings.

↑/↓ moves, Enter opens, Esc, a backdrop click or ⌘P again closes. It
doesn't open over another dialog.

## How it's built

- `src/app/CommandPalette.tsx`: the palette, mounted once in
  `RootLayout`. Native `<dialog>`, combobox + listbox.
- `src/shared/lib/commandSources.ts`: features register commands while
  they're on screen. `AiActions.tsx` registers its page's actions; the
  palette loads all sources each time it opens.
- `searchModuleLinks()` (`courses/lib/module/`) and `searchPageLinks()`
  (`courses/lib/page/`): joined, limited queries with `LIKE` escaping.

## Not included

- **System-wide shortcut** (opening mneme's search from another app, like
  ⌘Space): the shortcut only works while mneme is focused. A global
  hotkey needs a chain-sdk capability; request it only if it's wanted.
- A visible search button in the nav bar.
