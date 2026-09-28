# Phase 24 — AI Output to Editor

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 24. Builds
on the AI actions result panel (`21-ai-quick-actions.md`,
`22-custom-ai-actions.md`). No chain-sdk capability needed: it's all
editor and local-database work.

## Status — 27 September 2026

**Implemented, except child pages** (see below). Typecheck and web build
pass. Not yet exercised with a live agent run.

## Already there before this phase

- Replace selected text, append to the page (Phase 21).
- Editor blocks: the agent's Markdown becomes real headings, lists,
  checklists, tables and code (`editorHtml.ts`).
- "New page" as an action's automatic result (Phase 22).

## Added

- **Insert at cursor:** a run remembers where its result goes. After
  the selection if there was one; otherwise after the block holding the
  cursor, once the user has clicked into the page this visit; otherwise
  the end of the page. The insert button says which: "Insert below",
  "Insert at cursor" or "Add to page". Automatic "Insert below" results
  follow the same rule.
- **Add as section:** heading + content, placed the same way. It uses
  the agent's own heading when the reply opens with one, otherwise
  "## <action name>".
- **Save as page:** from the preview, the same page the "New page"
  result makes ("<action>: <page/module/course>", in this module), then
  opens it.
- **Undo:** after any AI change to the page (insert, section, replace,
  automatic insert), a notice "<Action> added to the page. Undo" shows
  for 10 seconds. Undo uses the editor's own history, and is only
  offered while the page is exactly as the AI left it, so it can never
  undo the user's own typing. ⌘Z keeps working as before.

## Not done: child pages

Pages are flat inside a module: no parent page, no page order column.
"Create child page" needs a real page hierarchy first: a `parent_id`,
nesting in the module page list and sidebar, moving/deleting subtrees,
backup/restore, and the agent-server tools. That's a feature of its own,
not an AI output option, so it's left for a separate decision.

## Code

- `ai-actions/lib/useAiAction.ts`: `Placement`, `addSection`,
  `saveAsPage`, `undo` / `undoNotice`.
- `ai-actions/components/AiActionResult.tsx`: Save as page, Add as
  section, placement-aware insert label.
- `ai-actions/components/AiActions.tsx`: the Undo notice.

## Manual test plan

1. Click into the middle of a page, run Summarize (preview). "Insert at
   cursor" puts it after that paragraph. Undo removes it.
2. Without clicking into the page, run it again: the button reads "Add to
   page" and appends at the end.
3. "Add as section" adds "## Summarize" + the summary (or the agent's own
   heading).
4. "Save as page" creates "Summarize: <page title>" in the module and
   opens it.
5. After an insert, type a character: the Undo notice disappears (⌘Z
   still works).
