# Phase 28 — Agent Permission System

## Status — 5 October 2026

**Built and run in the dev build.** A create_page call through the app's
MCP handler showed "Agent wants to make a change" with "Always allow
the agent to create pages"; Deny returned the refusal, created nothing,
and the Activity list showed it as Denied · Outside Chat. Ticking Allow
without asking on Create saved `agent.trusted-permissions` as `[2]`;
unticking cleared it. `tests/agent-tools.test.mjs` covers always-allow,
the every-time prompt for replacing a page, and the log's outcomes.
Migration 0034 applied. The Guide has an "Agent permissions" topic.

## Goal

Stop an AI agent making changes the student didn't want, without
asking about every small step once they trust it, and keep a record of
what it did.

## How it works

- **Permissions.** Each agent tool has one: Read (list, get, search,
  pictures, transcripts), Create (create_page, create_summary), Edit
  (insert_blocks, update_page), Move (move_page), Delete and Use the
  internet. No tool needs Delete or Use the internet yet; they're
  defined so later tools fit.
- **Asking.** Read never asks. Create, Edit and Move ask with "Agent
  wants to make a change", unless that permission is always allowed.
  Replacing a page's content and anything that deletes always ask, and
  can't be always allowed. Ask mode (Phase 27) still blocks every change.
- **Always allow.** For a change that can be trusted, the prompt has
  "Always allow the agent to create pages" (or edit, or move). Ticked
  and allowed, that permission stops asking, across restarts. Settings →
  Agent tools → Permissions lists every permission with what it covers;
  Create, Edit and Move have "Allow without asking" to turn trust on or
  off. This replaces Phase 25's "approved once per conversation" memory.
- **Activity log.** Every tool call is logged: when, which conversation,
  what (the same words as the prompt), its permission, and how it ended —
  read, allowed, allowed automatically, denied, failed (with the
  reason), or blocked in Ask mode. Settings → Agent tools → Activity
  shows the newest 50, and Clear activity deletes the log. The log keeps
  the newest 1,000 calls. It isn't in backups, like the conversations.

## Source locations

- `src/features/agent-server/lib/permissions.ts` — the permissions,
  their labels, which tools need which, and trusted ones (setting
  `agent.trusted-permissions`).
- `src/features/agent-server/lib/activity/` — the log (`agent_activity`,
  migration 0034).
- `src/features/agent-server/lib/mcp.ts`, `approvals.ts`, `tools.ts`.
- `src/features/agent-server/components/ApprovalPrompt.tsx`,
  `AgentPermissions.tsx`, `AgentActivity.tsx`; Settings → Agent tools.

## Acceptance criteria

- A create asks; ticking Always allow and allowing it lets the next
  create go through without asking, also after a restart.
- Settings shows Create as allowed without asking; unticking it makes
  the next create ask again.
- Replacing a page's content asks every time and offers no Always allow.
- The activity log lists reads, an allowed create, a denied one, and a
  change blocked in Ask mode, newest first; Clear activity empties it.
