# Phase 22 — Custom AI Actions

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 22, which
covers Recommended MVP item 13 ("Custom AI Action"). Builds on Phase 21
(`21-ai-quick-actions.md`), whose `ai_action` table, menu, runner and
result panel this reuses.

## Status — 23 September 2026

**Implemented.** chain-sdk shipped request 12 (`processRunner.run(...,
{ stdin })`) and propagated it into mneme; everything below is built.
Typecheck, build and migration tests pass. Verified live against the
real `claude` CLI with mneme's exact arguments and module-shaped content
on stdin, with stream-json output. That first run showed the agent
copying the `<page>` wrappers into its reply, so the task now asks for
plain Markdown with no HTML tags; the rerun came back clean. Not yet
exercised in the running app, and Codex's stdin path hasn't been run
live (it's documented in its `--help`).

**Changed from the plan:** module/course actions aren't disabled for
passthrough/custom agents. They still run, over argv with the
200,000-character cap, and the error names Claude or Codex as the way
past the cap. Claude and Codex now take *every* action's content on
stdin, page actions included, so the cap only applies to the other
agents.

## Goal

Let the user create their own reusable AI buttons: a name, an icon, a
prompt, what content it runs on, and where the result goes. They show up
in the same **AI actions** menu as the defaults.

## In scope

- **Manage actions** in Settings → "AI actions": a list of every action
  (defaults included, since they're ordinary rows) with **New action**,
  **Edit**, **Duplicate**, **Delete** and reordering. Reordering is by
  dragging each action's card by its grip handle; the same handle moves it
  with the ↑/↓ keys, so it's never drag-only. (Replaced the original
  move up/down buttons on 27 September.)
- **Action form** (dialog, same `Dialog` component as `PageForm`):
  - *Name*, required.
  - *Icon*: a small fixed set, like `courseIcons`, shown next to the name
    in the menu.
  - *Prompt*: the instructions, required.
  - *Runs on* (one choice, radio group):
    - **Selection or page**: today's behaviour (selection if any,
      otherwise the page).
    - **Whole module**: every page in the current module, in order.
    - **Whole course**: every page in every module of the course.

    The roadmap's mockup shows independent checkboxes (Current page +
    Current module + ...). Those overlap (the module already contains
    the page), so a single "Runs on" choice says the same thing without
    contradictory combinations. "Lecture notes" becomes an optional
    *Only these page types* filter (the existing `PageType` enum) on
    module/course scope, which is what it actually meant.
  - *Result goes to* (radio group):
    - **Preview first**: today's panel, where the user picks insert or
      replace.
    - **Insert below**: inserted automatically when it finishes (after
      the selection, or at the end of the page).
    - **New page**: a new page in the current module, titled "<action
      name>: <page or module name>", which opens when it's done.
- **Menu**: custom actions appear with their icon, in `position` order,
  with a "Module"/"Course" tag on the wider-scoped ones and a "Manage
  actions" link to Settings.

## Explicitly out of scope

- **Images as context**: pages' images are files; getting them to an
  agent means attachments or file access, which is a separate decision.
  Deferred.
- Sharing or importing actions (that's Phase 29, AI Action Packs).
- Per-action agent choice. The menu's "Run with" still applies to all
  actions.
- AI context profiles (Phase 23).

## Data model

Migration `0012-custom-ai-actions` (`output_mode` has never been read,
so it's replaced with numeric enums per the project convention in
`completion-status.ts`, not kept as TEXT):

```sql
ALTER TABLE ai_action DROP COLUMN output_mode;
ALTER TABLE ai_action ADD COLUMN icon TEXT;
ALTER TABLE ai_action ADD COLUMN scope INTEGER NOT NULL DEFAULT 1;   -- ActionScope: 1 page, 2 module, 3 course
ALTER TABLE ai_action ADD COLUMN output INTEGER NOT NULL DEFAULT 1;  -- ActionOutput: 1 preview, 2 insert below, 3 new page
ALTER TABLE ai_action ADD COLUMN page_types TEXT;                    -- JSON array of PageType, NULL = all
```

## Context building

`features/ai-actions/lib/context.ts` gathers the content:

- *Selection or page*: from the editor, as today.
- *Module / course*: `getPages` per module, each page as
  `<page title="…" type="…">…</page>` (plus `module="…"` for course
  scope). Page HTML is compacted: images become `[image]` placeholders
  and every attribute is dropped, keeping headings, lists and tables.

With the stdin capability, context goes on **stdin** and the prompt stays
in argv (Claude and Codex). Passthrough / custom agents keep argv and the
200,000-character cap; over it, the error points to Claude or Codex.

## Code layout

- `lib/actions.ts`: add `createAction`, `updateAction`, `deleteAction`,
  `duplicateAction`, `moveAction`.
- `lib/context.ts`: new, as above.
- `lib/runAction.ts` / `useAiAction.ts`: take the action's scope and
  output; the "New page" output calls `createPage` and navigates.
- `components/ActionForm.tsx`, `components/ActionSettings.tsx`: the
  Settings section and dialog.
- `components/AiActionsMenu.tsx`: icons, scope tags, and a "Manage
  actions" link to Settings.
- `components/ActionIcon.tsx`: the fixed icon set.
- `agent-chat/lib/runTurn.ts`: `acceptsStdin()` and a `stdin` parameter
  on `runOnce()` / `invokeAgent()`.

## Manual test plan

1. Settings → AI actions lists the 8 defaults. Create "Prepare
   discussion" (module scope, preview). It appears in the page's menu.
2. Run it on a module with several pages. The agent's answer references
   content from pages other than the open one.
3. Course scope with a "Lecture" page-type filter only sends lecture
   pages (check the prompt via a custom `cat`-style test connection).
4. Output "Insert below" inserts without a preview. "New page" creates
   the page in the module and opens it.
5. Duplicate, edit, move up/down, delete. The menu order follows.
6. With a custom (passthrough) connection, a module action on a small
   module runs; on content over 200,000 characters it shows the "choose
   Claude or Codex" error without spawning anything.
