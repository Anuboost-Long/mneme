# Phase 19 (redirected) — Agent Chat (Frontend Requirements)

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 19's
19 September 2026 addendum and follow-up corrections. Builds on Phase 25's
`agent-server` (implemented, `src/features/agent-server/`) and chain-sdk's
`process-runner` (implemented **and now live in mneme** — see "Status").

**For whoever picks this up (Codex or otherwise): read this whole doc
before touching code.** The core send/spawn/stream/tool-call/resume
pipeline is built and verified end-to-end against the real Claude Code
CLI. The picker and live chat UI are now implemented as well; see the latest
progress entry for verification and remaining limitations. The UI requirements
below describe the corrected flow that replaced Settings connection CRUD.

## Goal

A chat UI, inside mneme, backed by an AI coding agent CLI the user
**already has installed and is already authenticated into** — Claude
Code, OpenAI Codex, Gemini CLI, or any other agent they configure
themselves by name + invoke command (the same approach Lazify uses).
mneme never sees or stores a provider API key; it spawns the CLI the user
already logged into, the same way they'd run it from a terminal, and
layers its own UI on top — a "skin" over an agent the user already owns.

Each chat turn already gets tool access to mneme's own data
(`list_pages`, `create_page`, etc.) for free, via the CLI's own
`--mcp-config` pointed at mneme's already-running `agent-server`.

## Status — 19 September 2026

**Implemented and verified live** (via direct testing against the real
running app and the real installed `claude` CLI — see the verification
log at the bottom):

- `desktop.processRunner` is propagated into mneme (`chain update` run,
  `cargo check`/`tsc` clean) and proven with a real spawned process.
- `src/features/agent-chat/lib/detectAgents.ts` — real detection via
  spawning `<command> --version`; confirmed on the dev machine:
  `claude`/`codex` detected installed, `gemini` correctly detected not
  installed.
- `src/features/agent-chat/lib/runTurn.ts` — full real invocation for the
  `"claude"` connection kind: spawns the CLI, streams text incrementally,
  calls mneme's own `agent-server` tools via `--mcp-config`, persists
  messages/session-id/usage, resumes a prior session correctly (a
  follow-up turn recalled a fact from turn one with zero repeated
  context). See "Confirmed real API reference" below for exact
  signatures and JSON shapes — including a real bug found and fixed
  (`--mcp-config` needs a top-level `mcpServers` key).
- The existing data model/repositories (`connections.ts`,
  `conversations.ts`, `messages.ts`, `usage.ts`, migration 0004) are
  implemented and were already covered by the prior session's browser/
  repository tests (see the older progress entries at the bottom).

**Still blocked / not started:**

- Transcript-based usage/statistics (`transcriptUsage.ts`, reading each
  agent's own `~/.claude/projects/**/*.jsonl` / `~/.codex/sessions/**/*.jsonl`
  files) — blocked on `docs/chain-sdk-requests/11-external-file-read.md`,
  which hasn't even been sent to chain-sdk yet. `process-runner`-based
  per-invocation usage (`agent_usage`) works today as the fallback and is
  already wired into `runTurn.ts`.
- Codex's and Gemini's actual invoke flags — not researched, not
  implemented. Don't guess them.
- **UI integration is now implemented** — picker, composer, streaming, stop,
  custom passthrough, and tool activity. See the latest verification entry below.

## Confirmed real API reference

Exact signatures already implemented — call these, don't re-derive them:

```ts
// src/features/agent-chat/lib/detectAgents.ts
type DetectedAgent = { kind: AgentKind; installed: boolean };
function detectAgents(): Promise<DetectedAgent[]>;

// src/features/agent-chat/lib/runTurn.ts
type TurnEvent =
  | { type: "text"; text: string } // one incremental chunk of assistant text
  | { type: "done"; text: string } // full assistant text, turn complete
  | { type: "tool"; tool: { id: string; name: string; input: string; result?: string } }
  | { type: "error"; message: string };

function runTurn(
  connection: AgentConnection, // from connections.ts; "claude" and "custom" are supported
  conversationId: number,
  sessionId: string | null, // conversation.external_session_id, or null for a fresh turn
  message: string,
  onEvent: (event: TurnEvent) => void
): Promise<{ kill: () => Promise<void> }>;
```

`runTurn` already: appends the user message, starts `agent-server` on
demand if it isn't running, builds `claude`'s args, spawns via
`desktop.processRunner`, parses `stream-json` for text/result, appends
the assistant message, updates `external_session_id`, and records usage
— all before your UI code ever sees a `TurnEvent`. **The UI's only job is
to call `runTurn`, render the events, and call `.kill()` on cancel.**

**Two real findings from verifying against the actual CLI, not assumed:**

1. **`--mcp-config`'s JSON needs a top-level `mcpServers` key.**
   `{"mcpServers":{"mneme":{"type":"http","url":"<agent-server URL>"}}}` —
   NOT `{"mneme":{...}}` directly (that's `claude mcp add-json`'s shape,
   a different command). Passing the wrong shape fails the whole
   invocation with `Error: Invalid MCP configuration` on stderr and zero
   usable stdout — this is exactly why `runTurn.ts` captures stderr and
   surfaces it as a `TurnEvent`'s error message instead of silently
   returning empty text. Already fixed in `runTurn.ts`; mentioned here so
   nobody "fixes" it back.
2. **Tool-call transparency has two real, confirmed shapes to parse, if
   building that UI element** (now implemented in `runTurn.ts`):
   - A tool being called: `{"type":"stream_event","event":{"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"...","name":"mcp__mneme__list_courses","input":{}}}}`
     — the name is prefixed `mcp__mneme__` for mneme's own tools
     specifically (Claude Code's own built-in tools like `Read`/`Bash`
     have no prefix — only show the `mcp__mneme__*` ones as "did
     something to your data," per the doc's own scope).
   - A tool's result: a **separate, top-level** line (not wrapped in
     `stream_event`): `{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"...","content":[{"type":"text","text":"<the tool's JSON return value>"}]}]}}`.
   - Also observed: Claude Code may call its own internal `ToolSearch`
     tool before an MCP tool the first time in a session (lazy tool
     discovery) — expected, not a bug, and not `mcp__mneme__`-prefixed so
     it won't trigger the "did something to your data" indicator anyway.

## In scope for this increment

- **"Choose an agent" is a picker, opened from starting a new chat — not
  a Settings page you configure ahead of time.** Corrected against a
  screenshot of Lazify's own real UI: it's a modal titled "Choose an
  agent" / "Pick which coding agent to start," listing every known agent
  as one ready row each — icon, name, and either a `>` chevron (installed,
  clickable, starts immediately) or a greyed "Not installed" label
  (disabled, from `detectAgents()`). Below the list: **"Resume a
  session"** (continue an existing conversation instead of starting one)
  and, as a distinct dashed-border secondary action, **"Add custom
  agent."** There is no separate pre-configuration step — an installed
  agent is just clickable, right there, the moment you open the picker.
- **Known agent list, matching Lazify's own** (its actual screenshot
  shows five): Claude, Codex, Gemini, Copilot, Cursor. Only Claude Code's
  invoke flags are confirmed (above) — the other four are listed the same
  way Lazify lists them (so "not installed" is visible and honest even
  for ones mneme can't fully drive yet), but don't fabricate invoke flags
  for any of them. Selecting an installed-but-unimplemented preset (e.g.
  Codex) should say so plainly rather than silently failing at send time.
- **Auto-detect installed agents** via `detectAgents()` — already
  implemented, just call it. Clickable row = installed; greyed "Not
  installed" = not.
- **"Add custom agent"** — the fallback for anything not in the known
  five, same Lazify method: the user gives it a name and an invoke
  command right there in the picker (a small inline form, not a
  navigation to Settings), and it's added to the connections list going
  forward alongside the detected presets. Uses the existing
  `createConnection` from `connections.ts` — no changes needed there.
- **"Resume a session"** — a second path out of the same picker, into
  mneme's own stored conversation list (`getConversations()`) rather than
  starting a new one.
- **Custom agent invocation is plainer by design.** mneme doesn't know a
  custom command's output format: no structured token-delta parsing, no
  tool-calling assumption, no session-resume assumption — just spawn with
  the user's message appended as the final argv element, and stream raw
  stdout into the chat live, like a terminal pass-through. **Implemented in `runTurn.ts`** alongside the Claude branch.
- **Chat screen**: conversation list + active conversation pane: message
  history, a text input, a "stop generating" action (call the handle's
  `.kill()`) while a turn is in flight, and a per-conversation indicator
  of which connection it's using (fixed at creation — session resumption
  is tied to that specific CLI's session id).
- **Streaming display**: render `TurnEvent`s as they arrive from
  `runTurn`'s `onEvent` callback — append `"text"` chunks live, replace/
  finalize on `"done"`, show `"error"` inline. Rendering partial Markdown
  mid-stream can look broken (unclosed formatting); a final full Markdown
  pass on `"done"`'s full text is an acceptable simplification — reuse
  `marked` (already a dependency, used by the file importer) rather than
  adding another library.
- **Tool-call transparency**: parse the two confirmed shapes above and
  show something like "Used tool: list_courses" (stripping the
  `mcp__mneme__` prefix for display) distinctly from assistant text —
  the user should always be able to see what the agent actually did to
  their data. `runTurn.ts` emits a `TurnEvent` tool variant with its ID, name,
  arguments and optional result; no separate side channel is used.
- **Session persistence and retention**: already implemented
  (`agent_conversation`/`agent_message`/retention cleanup) — nothing new
  needed here, just consume it.

## Explicitly out of scope for this increment

- **Tool-call permission/confirmation prompts.** Phase 28 (Agent
  Permission System) doesn't exist yet. Acceptable for now only because
  `agent-server`'s current tool set has no delete/move operations (see
  `src/features/agent-server/lib/tools.ts`) — revisit the moment any
  destructive tool is added there.
- **Editing or regenerating a past message.**
- **Multiple simultaneous in-flight turns within one conversation** — one
  turn at a time; disable the input (or turn Send into Stop) while a turn
  is in flight.
- **Cross-device sync** of conversations — local `desktop.storage` only.
- **Codex/Gemini/Copilot/Cursor actually working end-to-end** until their
  flags are researched and implemented in `runTurn.ts` — listing them in
  the picker (per "In scope" above) doesn't imply they function.
- **Transcript-based usage/statistics** — blocked on
  `11-external-file-read.md`; the existing `agent_usage` (process-exit)
  fallback is what's available today.
- **Any change to `agent-server`'s tool set.**

## Data model (implemented — no changes needed)

Migration 0004 already creates `agent_connection`, `agent_conversation`,
`agent_message`, `agent_usage`, plus their indexes and integrity triggers
(a connection can't be deleted while it has conversations, a conversation
can't switch connections, etc. — see
`src/shared/lib/db/migrations/0004-agent-chat.ts` for the exact triggers
if extending this table set). `agent_usage_source`/`agent_usage_daily`
(for transcript-based stats) are **not yet migrated** — add them in a new
migration when `transcriptUsage.ts` actually gets built, not before.

## Backend/service layer

**Implemented, don't rebuild:**

- `src/features/agent-chat/lib/connection/`, `conversations.ts`,
  `messages.ts`, `usage.ts` — CRUD + retention cleanup, already tested.
- `src/features/agent-chat/lib/presets.ts` — Claude/Codex/Gemini preset
  metadata.
- `src/features/agent-chat/lib/detectAgents.ts` — real installed-agent
  detection.
- `src/features/agent-chat/lib/runTurn.ts` — real invocation for
  `kind === "claude"` and custom-agent passthrough, including tool-call
  events for Claude (per "In scope" above).

**Still needed:**

- `src/features/agent-chat/lib/transcriptUsage.ts` — blocked on
  `11-external-file-read.md`; don't start until that capability exists.

## UI needed

**Remove/replace, don't keep alongside the new flow:**

- The Settings → Agent Tools → "Agent Connections" CRUD section
  (`AgentConnections.tsx`, `ConnectionForm.tsx`, and their wiring in
  `SettingsPage.tsx`) implements the pre-correction flow — configure a
  connection in Settings before you can chat. Replace it with the picker
  described below. `connections.ts`'s functions underneath are fine and
  reused by the picker's "Add custom agent" form — only the _page_ that
  calls them is wrong.

**Build:**

- **"Choose an agent" picker** (modal or full-screen, your call) —
  triggered from a "New chat" action on the Agent Chat screen. Lists
  Claude/Codex/Gemini/Copilot/Cursor via `detectAgents()`, each row
  clickable if installed (creates a connection via `createConnection` if
  one doesn't already exist for that kind, then `createConversation`,
  then navigate into the conversation) or greyed "Not installed." Below:
  "Resume a session" (opens the conversation list) and "Add custom
  agent" (inline name + command + args form using `createConnection`
  with `kind: "custom"`).
- **Chat screen** (`/agent-chat`, already routed — see `AgentChatPage.tsx`
  and `ConversationForm.tsx` for what's already there to build on):
  conversation list, active transcript, compose box wired to `runTurn`,
  stop-generating control, tool-call indicators.
- **Retention setting** — already implemented per the prior session's
  progress notes; keep it, just relocate it if it was living next to the
  CRUD section being removed.

## Routes

- `/agent-chat` — already added (`src/routes/AgentChatRoute.tsx`,
  `router.tsx`). No change needed.

## Manual test plan

**Already verified programmatically this session** (via direct calls to
`detectAgents`/`runTurn`, not through any UI — see the log below):
detection matches real installed CLIs; a real Claude Code turn streams
text incrementally and produces the correct final answer; a real
`mcp__mneme__list_courses` tool call succeeds and returns real data;
session resume correctly recalls prior-turn context; messages/session-id/
usage all persist correctly.

**UI-level regression checklist** (completed checks are recorded below):

- Open the picker, confirm Claude/Codex show as installed (real
  machine-dependent, but should reflect whatever's actually there) and
  Gemini/Copilot/Cursor show "Not installed" unless actually installed.
- Start a chat with Claude, send a message, confirm text streams
  incrementally in the UI (not all at once).
- Ask it to do something that calls a mneme tool (e.g. "list my
  courses") and confirm a tool-call indicator appears and the data
  shown matches reality.
- Send a follow-up in the same conversation, confirm it has the prior
  turn's context (proves the UI is passing `external_session_id`
  correctly).
- Click "stop generating" mid-turn, confirm the process is killed and
  the input returns to idle.
- Add a custom agent (e.g. `echo`), start a chat, confirm raw stdout
  passthrough works and doesn't try to parse it as `stream-json`.
- Restart the app, confirm conversations/messages persisted.

## Implementation progress — 19 September 2026 (functionality pass)

Built and verified live against the real running app and the real
installed `claude` CLI (not mocked, not simulated):

- Ran `chain update`; `desktop.processRunner` confirmed working via a
  real spawned subprocess (`echo`, real streamed stdout chunk, correct
  exit code).
- `detectAgents.ts`: real detection confirmed against the actual dev
  machine (`claude`/`codex` installed, `gemini` not).
- `runTurn.ts`: full real pipeline verified — spawn, stream text
  incrementally, `agent-server` auto-start, real `mcp__mneme__list_courses`
  tool call with correct data back, session persistence, and session
  resume (a follow-up turn correctly recalled a number from turn one with
  no repeated context). Found and fixed a real bug along the way:
  `--mcp-config` requires a top-level `mcpServers` key, confirmed by
  reproducing the exact failure (`Error: Invalid MCP configuration`) via
  the real CLI before fixing it. Added stderr capture so a failed
  invocation surfaces a real error instead of silently returning empty
  text.
- Also confirmed the real JSON shapes for tool-call streaming
  (`content_block_start` with `content_block.type === "tool_use"`) and
  tool results (a top-level `"type":"user"` line with a `tool_result`
  content block) — not yet wired into `runTurn.ts`'s event extraction,
  documented above for whoever adds it.
- All test data (connections/conversations/messages/usage) created
  during verification has been deleted from the real database.
- Did not touch any UI — the existing (pre-correction) Settings CRUD
  screen and the chat page's disabled-send state are both untouched;
  see "UI needed" above for what replaces them.

## Implementation progress — 19 September 2026 (earlier, frontend/storage pass)

The unblocked frontend/storage increment (before the functionality pass
above, and before the Lazify-picker correction) was implemented:

- Migration 0004 adds the four tables and their current row types. Repositories
  cover connections, conversations, messages, usage, and retention settings.
- Settings → Agent Tools includes connection add/edit/delete, per-connection
  usage summaries, and Never/custom-day retention. Codex and Gemini presets
  explicitly say they are not yet verified; no invocation flags are invented.
  **(Superseded by the picker-flow correction above — see "UI needed.")**
- `/agent-chat`, the sidebar entry, and a home shortcut open the conversation
  list and transcript. Search, saved sorting/grouping, rename, delete, empty
  states, loading/errors, and a fixed connection indicator are implemented.
- While sending is blocked, creating a conversation saves an empty conversation.
  The composer is disabled and does not queue or save unsent messages. The
  first-message creation flow will be connected alongside real invocation.
- Connection deletion is blocked while it has conversations. Its name remains
  editable, but its kind, executable, and arguments are locked to preserve
  session identity. Conversation deletion removes messages and detaches usage;
  connection deletion removes its remaining usage history.
- Startup cleanup runs after database migration and before loading the workspace.
  Retention uses the conversation's last activity, defaults to Never, and keeps
  per-connection usage totals. Database triggers make cleanup and identity guards
  atomic even when the storage connection does not enable SQLite foreign keys.

Verification: `npm run build:web` and `node --test tests/*.test.mjs` cover the
frontend build and repository/database behavior. Browser verification passed
for connection validation/create/edit/delete, locked agent identity,
conversation create/rename/reload/search/group, disabled sending, escaped
transcript/tool history, retention cleanup on startup, storage failure and
retry, and light/dark mobile layouts. Screenshots and the local browser check
are in the ignored `.local-checks/agent-chat*` files.

## Implementation progress — picker and live chat UI

- Replaced Settings connection CRUD with `AgentPicker`, opened by **New chat**.
  Claude, Codex, Gemini, Copilot, and Cursor are detected; installed unsupported
  presets explain their status immediately. Custom agents are added inline and
  reused from the picker. Resume a session focuses the existing conversation list.
- Kept retention in Settings → Agent Tools as `ChatRetention`. Removed the old
  `AgentConnections` and `ConnectionForm` components and their imports.
- Wired the composer to `runTurn`, with incremental plain text, final Markdown
  for Claude, raw custom-agent output, and stop during startup or generation.
  Module-level turn state survives route navigation and locks each conversation
  against overlapping turns and deletion while generating. Each new invocation
  reloads the conversation's saved session ID before calling the runner.
- Extended the existing runner for literal custom argv passthrough, complete
  trailing JSON lines, Mneme tool calls/argument deltas/top-level tool results,
  error results, nonzero exits with partial output, and cancellation. Partial
  replies and tool records persist alongside invocation statistics.
- Final Markdown uses `marked` with raw HTML escaped, images rendered as text,
  and links restricted to HTTP(S)/mailto. No agent HTML is executed in the app.
- Copilot/Cursor are detection-only metadata; no schema changes or unsupported
  invocation flags were added. Detection commands follow the official
  [Copilot CLI reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference)
  and [Cursor CLI installation reference](https://docs.cursor.com/en/cli/installation).

Validation: frontend production build and all 29 repository/runner/rendering
checks passed. Browser tests with real SQLite and simulated process events passed
for picker availability, unsupported presets, custom input validation, streaming,
Markdown safety, tool history, resume, navigation while generating, cancellation,
reload, retained settings, keyboard operation, and mobile layout. Settled dialog
and transcript screenshots are in `.local-checks/agent-picker-*` and
`.local-checks/agent-chat-live-*`. No standalone lint command is configured.

Native UI verification also passed through the running app's dev inspector:
installed-agent detection matched this machine; Claude streamed a real reply,
called `list_courses` with a persisted tool indicator, and recalled the prior
verification code on the next turn using the saved session. A custom `echo`
connection saved stdout verbatim. A custom `sleep` process was stopped from
**Stop generating**, persisted the stopped state, and returned the composer to
idle. Temporary smoke-test conversations, usage, and new test connections were
removed; the app was returned to Home. Full native app restart was not repeated
in this UI pass; browser reload and native database reads verified persistence.

Development note: hot reload can leave the native agent server running while
resetting its JavaScript state. The native smoke test stopped that development
server and reloaded the webview before testing from a clean state; production
server behavior and the existing agent-server tool registry were not changed.

### Chat output presentation

Assistant Markdown now renders while streaming and in saved history. Code
blocks have a language header, a copy action with success/failure feedback, and
horizontal scrolling. Tables retain semantic headers and column alignment,
with subtle row dividers and an independently scrollable wrapper. Raw HTML,
unsafe links, and images retain the existing escaping rules.

Function disclosures show a readable name and Running, Finished, Failed, or
No result status. Expanded details separate input from output, format JSON,
and unwrap MCP text blocks. The original function name remains available in
the details. Claude tool errors persist in the existing tool message JSON;
saved calls without a result never appear to still be running.

Browser verification used simulated tool records at desktop and 375px widths
in both themes: keyboard disclosure, code copying and denied clipboard access,
decoded output, and page overflow passed. Screenshots are in
`.local-checks/chat-output-*.png`. Rendering safety and persisted tool-error
status have regression coverage in `tests/agent-chat.test.mjs`. No standalone
lint command is configured. Native execution was not repeated for this pass.
