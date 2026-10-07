# Choose the agent for every AI process

Source: the user, 7 October 2026: "when preparing module I don't get to
choose agent I want to use … every process related to AI should involve
user picking agent or pick a default."

## Status

Built 7 October 2026. Checked in the dev build: Settings → AI shows the
Default agent; Prepare module shows the Agent field set to it; a chosen
agent id resolves to that agent (Claude or Codex), and a removed one
falls back to the default. Not yet run end to end with Codex.

## The problem

Every AI process except Agent chat uses one saved agent, which can only
be changed from the "Run with" field inside the AI actions menu on a
page. Preparing a module, writing a quiz, a study session, flashcards,
finding tasks and AI blocks give no choice and don't say which agent
will run.

## Behaviour

- **Default agent** (Settings → AI): the agent every AI process starts
  with. It's the same saved setting "Run with" used to change
  (`ai-actions.connection-id`), so nobody's choice is lost. With none
  saved, or the saved one removed, it's the first connected agent.
- **Where a process starts from a form or dialog, it has an Agent
  field**, set to the default agent. Changing it applies to that run
  only; the default changes only in Settings.
  - Prepare module (`PrepChoices`)
  - New quiz (`NewQuizDialog`)
  - Study session (`StudyPage`)
  - Make flashcards (`FlashcardsPage`)
  - Find tasks with AI (`FindTasksDialog`)
  - AI block (`AiBlockNodeView`)
  - AI actions menu (`AiActionsMenu`, "Run with" becomes "Agent" and
    no longer saves)
- **Processes with no form use the default agent**: flashcards made
  after an import, page type detection during an LMS import, Ask from
  the command palette, the Quick actions widget.
- With no agent connected, the Agent field says so and links to Agent
  chat, and the start button is disabled.
- Error messages that said "Choose Claude or Codex under Run with in the
  AI actions menu" say "Choose Claude or Codex as the agent" instead.

## Source

- `features/agent-chat/lib/connection/actions.ts` —
  `getDefaultConnectionId`, `setDefaultConnectionId`,
  `getAgentConnection(connectionId?)` (the chosen one, else the default,
  else the first). Replaces `getActionConnection*` in
  `features/ai-actions/lib/action/actions.ts`.
- `features/agent-chat/lib/useAgentChoice.ts` and
  `features/agent-chat/components/AgentSelect.tsx` — the Agent field.
- `features/agent-chat/components/DefaultAgentSettings.tsx` — the
  Settings → AI section.
- Every generate function takes the chosen `connectionId`.

## Chain dependency

None.

## Acceptance

- Settings → AI shows the default agent; changing it changes what every
  form starts with.
- Each form above shows the Agent field with the default selected;
  choosing another agent runs that process with it, and the next form
  still starts at the default.
- Automatic processes run with the default agent.
- With no agent connected, each form says so and can't start.
