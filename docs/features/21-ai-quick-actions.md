# Phase 21 — AI Quick Actions

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 21, which
covers Recommended MVP item 12 ("Summarize Page"). MVP item 11 ("Basic AI
Chat") is done as agent chat (`19-agent-chat.md`). Item 13 ("Custom AI
Action") is Phase 22 and builds on the model added here.

## Goal

One-click AI operations on the page being read or edited. The user picks
an action (Summarize, Explain, ...), the output streams into a preview,
and the user decides what to do with it: insert it, replace the
selection with it, copy it, or discard it.

## Chain SDK: nothing new needed

A quick action is one prompt sent to one agent, not a conversation, so it
runs on capabilities mneme already has:

- `desktop.processRunner` spawns the agent CLI the user already
  connected in agent chat (Claude, Codex, Gemini, Copilot, Cursor, or a
  custom command). mneme still never holds an API key.
- The text to work on goes into the prompt itself, not through
  `agent-server` tools. That lets every connection kind run a quick
  action (the passthrough kinds have no MCP support), and it means a
  quick action never needs write approval.
- The prompt is one argv element, and macOS limits the total argument
  size to about 1 MB. mneme refuses anything over
  `MAX_CONTEXT_CHARS` (200,000 characters) with a clear error instead of
  letting the spawn fail. A single page or selection fits well under
  that.

**Update (Phase 22):** module-wide actions did need more than fits in
argv, so chain-sdk added stdin to `processRunner`
(`chain-sdk-requests/12-process-runner-stdin.md`). Claude and Codex now
get every action's content on stdin; the cap, renamed
`MAX_ARGV_CONTEXT_CHARS`, only applies to the other agents.

## In scope for this increment

- **AI Action model.** The existing `ai_action` table (from 0001, unused
  until now) gains a `position` column, and the default actions are
  seeded in the same migration:
  Summarize, Explain, Simplify, Translate to English, Find key points,
  Create revision notes, Extract tasks, Organize notes.
- **Action menu.** An "AI actions" button above the editor opens a menu
  of the actions.
- **Scope.** If text is selected, the action runs on the selection;
  otherwise it runs on the whole page. The menu says which ("Selected
  text" / "Whole page") so it's never a guess.
- **Agent choice.** The menu has a "Run with" picker listing the agent
  chat connections. The choice is saved in `settings`
  (`ai-actions.connection-id`) and defaults to the first connection.
  With no connections, the menu links to Agent chat to add one.
- **Progress and preview.** A result panel above the page shows the
  action and scope, streams the output (rendered Markdown), and has a
  Stop button while it runs.
- **Output.**
  - *Insert below*: after the block holding the end of the selection,
    or at the end of the page for whole-page actions.
  - *Replace selection*: only for selection actions.
  - *Copy* and *Discard*.

  Insert and replace are normal editor transactions, so Cmd+Z undoes
  them and autosave picks them up. The selection range captured when
  the action started is mapped through every later edit, so typing
  during a run doesn't make the insert land in the wrong place.
- **Usage.** Each run is recorded in `agent_usage` with
  `conversation_id = NULL`, like any other invocation.

## Explicitly out of scope (deferred)

- **"Allow actions on current module"**: needs either module content
  inline (size limits above) or read-only tool access for one-shot
  runs. Deferred to its own increment.
- **Generate flashcards / Generate quiz**: need the Phase 37/38 data
  models to put their output into.
- **Transcribe**: needs audio (Phase 16/17).
- **Translate to another language**: the default action targets
  English. Phase 22 (custom actions) lets the user edit the prompt or add
  their own.
- **Creating, editing, deleting or reordering actions**: Phase 22.
- **A right-click entry in the selection menu**: the toolbar menu
  already covers selections. Could be added later if wanted.

## Data model

Migration `0011-ai-action-defaults`:

```sql
ALTER TABLE ai_action ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
INSERT INTO ai_action (name, prompt, position) VALUES (...8 defaults...);
```

`output_mode` (TEXT, from 0001) stays as it is and unused until Phase 22
decides the output modes. It's not converted to a numeric enum here
because nothing reads it yet.

## Code layout

- `src/features/ai-actions/lib/actions.ts`: `getActions()`, and the saved
  connection choice (`getActionConnectionId`/`setActionConnectionId`).
- `src/features/ai-actions/lib/runAction.ts`: builds the prompt from the
  action and the context HTML, enforces `MAX_ARGV_CONTEXT_CHARS`, and runs it
  through agent chat's shared one-shot runner.
- `src/features/ai-actions/lib/editorHtml.ts`: turns the agent's Markdown
  into plain HTML the editor can take. The chat renderer's
  `renderMarkdown` isn't used for this because its code-block and table
  markup (copy buttons, wrappers) would end up in the page as text.
- `src/features/ai-actions/components/AiActionsMenu.tsx`: the trigger
  button and menu.
- `src/features/ai-actions/components/AiActionResult.tsx`: the result
  panel.
- `src/features/agent-chat/lib/runTurn.ts`: spawning, line buffering and
  failure detection move into a shared `invokeAgent()`. `runTurn()`
  (chat, with persistence) and the new `runOnce()` (quick actions, no
  conversation) both use it, so there's one copy of the stream-parsing
  and error logic.
- `PageEditor.tsx`: owns the run, since it owns the editor. It renders
  the menu and the result panel.

## Manual test plan

1. With no agent connection: open a page, open AI actions. The menu
   offers a link to Agent chat, not a broken run.
2. With a Claude connection: run Summarize with nothing selected. Output
   streams into the panel. Choose Insert below and it's added at the end
   of the page. Cmd+Z removes it. The page autosaves.
3. Select a paragraph, run Simplify, then Replace selection. Only that
   paragraph changes.
4. Select text, run Explain, and type elsewhere on the page while it
   runs. Insert below still lands after the originally selected block.
5. Stop mid-run. The panel shows "Generation stopped." and nothing is
   inserted.
6. Switch "Run with" to Codex, reload, and reopen the menu. Codex is
   still selected.
7. A page over 200,000 characters shows the "too long, select part of
   it" error without spawning anything.
