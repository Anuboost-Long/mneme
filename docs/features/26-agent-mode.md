# Phase 26 — Agent Mode

## Status — 5 October 2026

**Done.** The loop, tool calls, history, Running/Finished cards, Stop,
error recovery and approvals already existed (Phases 19, 25, 27, 28);
this phase added the tool-call limit and the loop guard. Run in the dev
build through the app's own modules: three identical get_module calls in
the motives conversation went through and the fourth was refused and
logged as "Stopped: repeated call"; Clear activity then emptied the log.
`tests/agent-tools.test.mjs` covers the limit, the guard, and a fresh
budget per message. A real agent reaching 50 calls hasn't been seen.

## Goal

Let the agent take several steps on its own — read a module, its pages
and transcripts, then write a summary page — while the student can see
what it's doing, stop it, and trust that it can't run away.

## How it works

- **The loop** is the connected agent's own (Claude Code, Codex): it
  plans, calls mneme's tools over the agent server, reads the results
  and decides the next step. mneme supplies the tools, the approvals and
  the limits.
- **Seeing it work.** Each tool call shows in the chat as a card,
  Running then Finished or Failed, and is saved in the conversation. The
  message box's Stop button ends the run.
- **Errors.** A tool that fails returns its reason to the agent, which
  can try another way.
- **Approval** comes from Phases 27 and 28: Ask mode blocks changes,
  Agent mode asks per permission.
- **Tool-call limit.** Each message the student sends gets 50 tool
  calls. Past that, a call is refused with "This reply has used its 50
  tool calls…", telling the agent to stop and report what it did and
  what's left.
- **Loop guard.** The same call — same tool, same arguments — more than
  3 times in a row in one reply is refused, telling the agent the result
  won't change and to try another approach or explain what's blocking
  it.
- Both refusals are logged in Settings → Agent tools → Activity
  ("Stopped: tool-call limit", "Stopped: repeated call"). They apply to
  agents started from mneme's Chat, which mark where each message
  starts; an agent connected from outside (Settings → Agent tools) has
  no message boundaries, so it isn't limited.

## Source locations

- `src/features/agent-server/lib/budget.ts` — calls per message and
  repeats.
- `src/features/agent-server/lib/mcp.ts` — spends the budget before each
  call; `activity/types.ts` — the two outcomes.
- `src/features/agent-chat/lib/runTurn.ts` — starts each message's
  budget.

## Acceptance criteria

- A 51st tool call in one reply is refused with the limit message and
  logged.
- A 4th identical call in a row is refused and logged; a different call
  in between resets the count.
- The next message starts with a fresh budget.
- An agent connected from outside Chat isn't limited.
