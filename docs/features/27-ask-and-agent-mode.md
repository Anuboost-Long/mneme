# Phase 27 — Ask Mode and Agent Mode

## Status — 5 October 2026

**Built and run in the dev build** with Claude (a test conversation,
deleted afterwards): in Ask mode the agent listed courses, modules and
pages, read the cyber threats page and summarised it, and declined to
create a page, pointing to Agent mode — no prompt, no page. Switched to
Agent in the same conversation, it asked "Create a page titled "Attacker
types" in module #47"; Deny left nothing behind. The every-time prompt
for replacing a page is covered by `tests/agent-tools.test.mjs`, not yet
seen in the app. Migration 0033 applied; existing conversations became
Ask. The Guide has an "Ask and Agent" topic.

## Goal

Let the student choose, per conversation, whether the agent only reads
and answers (Ask) or may change the workspace (Agent), and always see
which one is on.

## How it works

- **Each conversation has a mode**, saved with it. New conversations
  start in **Ask**. The switch sits above the message box, with one line
  saying what the mode allows.
- **Ask mode**: the agent is offered only mneme's read tools — courses,
  modules, pages, searching pages, page pictures, transcripts. It reads,
  searches, explains, analyses and drafts in the chat, and suggests
  changes in its reply instead of making them. A change it tries anyway
  is refused with "This conversation is in Ask mode…". Its instructions
  say which mode it is in.
- **Agent mode**: every tool, as today. A change asks for approval the
  first time in a conversation; later ones go through. Replacing a
  page's content (`update_page` with `content`) is destructive, so it
  asks every time.
- **Ask from anywhere**: in the command palette (⌘P), typing a question
  offers **Ask: “…”** (after any matching pages and commands, so Enter
  still opens a match first). It opens the agent chat panel over the
  current screen and starts a new Ask-mode conversation with the agent
  the AI actions use, telling it which page is open. Without a question
  the palette offers **Ask the assistant**, which just opens the panel.
  On the Chat screen the palette doesn't offer it. With no agent
  connected, the panel says so. (`lib/assistant.ts`, `CommandPalette.tsx`.)
  Tried in the dev build: from the cyber threats page, “What are the
  motives that drive an attacker?” opened the panel, which read that
  page and listed the six motives.
- Switching mode takes effect from the next message. An agent started
  outside the app (Settings → Agent tools) has no conversation and keeps
  today's behaviour.

## Source locations

- `src/shared/lib/db/schema/agent-conversation.ts` — `mode` column
  (`ConversationMode`: Ask = 1, Agent = 2), migration 0033.
- `src/features/agent-chat/lib/conversation/` — `ConversationMode`,
  `setConversationMode`.
- `src/features/agent-server/lib/mcp.ts`, `tools.ts` — tools offered and
  allowed by mode; `destructive` calls always ask.
- `src/features/agent-chat/lib/runTurn.ts` — the mode in the agent's
  instructions.
- `src/features/agent-chat/components/ModeSwitch.tsx`, `ConversationPane.tsx`.

## Acceptance criteria

- A new conversation is in Ask mode and says so above the message box.
- In Ask mode, asking the agent to create a page gets a suggestion in
  the reply and no page; no approval prompt appears.
- In Ask mode the agent can still find and quote the user's pages.
- In Agent mode, creating a page asks once; a second create in the same
  conversation doesn't ask; replacing a page's content asks every time.
- The mode is kept when the conversation is reopened.

## Out of scope

- Web search from Ask mode (Phase 28's External Access permission).
- Per-tool "always allow" and the activity log (Phase 28).
