# Capability Request 10 — Run an external CLI and stream its output

Source: user request — an in-app chat UI ("Agent Tools" management, layered
UI like Lazify's) backed by AI coding agent CLIs the user already has
installed and authenticated (Claude Code, OpenAI Codex, Gemini CLI, and —
same as Lazify's own approach — any other agent the user configures by
giving its name and invoke command), not a provider API key mneme manages
itself. Roadmap-wise this sits next to Phase 19/25/26 but isn't quite any
of them as originally scoped — see the addendum added to the roadmap doc.

**Not part of this request** (called out up front since the user asked
for both): per-agent usage/statistics tracking and mneme's own session
persistence/retention. Both are covered in their own section near the
bottom — neither needs anything beyond what's already asked for here.

## Why this needs a new capability

mneme's own rule is to never touch a native/OS API directly from the
webview (`AGENTS.md`) — a webview has no `child_process` equivalent, so
spawning `claude`/`codex` and reading their output has to be a chain-sdk
capability, the same reasoning behind every prior request here.

## Why CLI subprocess, not a bundled SDK

Researched both routes before writing this. Anthropic's own Claude Agent
SDK (`@anthropic-ai/claude-agent-sdk`) is the faster, more ergonomic
option in the abstract — but it's a Node.js library requiring mneme
itself to hold an `ANTHROPIC_API_KEY` and bundle a Node runtime mneme
doesn't have (it's Tauri + Rust + a webview, no embedded Node). That
directly contradicts the actual ask: the user wants to connect *their
own* already-installed, already-authenticated agent, the same one they'd
run from a terminal — mneme should never see or manage a key. Spawning
the CLI binary the user already has and already logged into is the only
option that fits both the product requirement and mneme's actual stack.

## What mneme actually does with this (context for scoping)

Confirmed via research into Claude Code's real headless-mode flags:
each chat turn is a **separate, one-shot process invocation**, not a
persistent interactive session:

```
claude -p "<user message>" --resume "<session_id>" \
  --output-format stream-json --verbose --include-partial-messages \
  --mcp-config '{"mneme":{"type":"http","url":"http://127.0.0.1:<port>/mcp"}}'
```

- `session_id` comes back in the first turn's output and gets passed to
  every subsequent turn via `--resume` — mneme stores this per
  conversation, chain-sdk doesn't need to know about it at all.
- `--mcp-config` pointing at mneme's own already-built `agent-server`
  (request 9) gives that invocation tool access to `list_pages`/
  `create_page`/etc. for free — no new plumbing between this capability
  and that one. (The exact MCP config transport key — `"http"` vs
  `"sse"` vs something else — needs confirming against Claude Code's
  actual current schema at implementation time; flagged, not assumed.)
- Output is newline-delimited JSON on stdout mneme parses itself
  (`{"type":"stream_event","event":{"delta":{"text":"..."}}}` for
  incremental tokens, a final `{"type":"result", session_id, ...}` when
  the turn completes) — **this capability has zero awareness of that
  format**, same "native primitive, app owns semantics" line `http`/
  `files`/`agent-server` all already draw. It just needs to get raw
  stdout text back to JS as it's produced, not wait for the process to
  exit before returning anything.
- **Codex and Gemini CLI's equivalent flags are not confirmed** — only
  Claude Code's headless-mode flags above were actually researched and
  verified against current docs. Codex has its own `codex exec` headless
  mode and Gemini CLI has its own equivalent, but their exact flag names,
  streaming output format, and session-resume mechanism need real
  verification at implementation time, the same "don't assume, confirm"
  posture this request's own Windows section takes. Mneme's app-level
  preset for each one will need its own confirmed flag set; this
  capability itself doesn't care what those flags are.
- **Custom/arbitrary agents get a plainer fallback.** For a preset mneme
  knows the output shape of, it parses structured events for clean
  token-by-token streaming. For a user-typed custom command, mneme has no
  idea what its stdout looks like — the plan is to just render its raw
  incremental stdout in the chat, live, as it arrives (like a terminal
  pass-through), rather than trying to guess a JSON shape. That's still
  just "give me the stdout as it's produced," the same primitive as
  above — no extra capability need from a custom agent being unstructured.

## What mneme needs

A way to spawn a named executable with arguments and get its stdout back
**incrementally**, not just as one blob after exit — a chat UI showing
tokens as they're generated needs that, and buffering to end-of-process
would defeat the entire point of `--include-partial-messages`. Exact
shape is chain-sdk's contract call (rule 2), but at minimum:

- Spawn by executable name (resolved via `PATH`, e.g. `"claude"`) plus an
  argv array — **never** a shell string mneme or chain-sdk constructs by
  concatenation. The user's message text becomes one argv element, not
  interpolated into a command string; standard injection-avoidance, not
  a preference.
- Streamed stdout, delivered to a JS callback as chunks arrive (mirrors
  `agent-server`'s "native side owns the OS primitive, forwards to a JS
  handler" shape, just outbound instead of inbound).
- A way to know the process's exit code / that it finished, and a way to
  kill it early (a chat UI needs a "stop generating" action — cheap to
  include now, awkward to bolt on later).
- **No shell interpretation, no persistent stdin, no PTY.** Each turn is
  its own process that runs to completion; nothing in mneme's own design
  needs a long-lived interactive process to write follow-up input into.
  Scoping this out keeps the capability to "run this, stream what it
  prints, tell me when it's done" rather than a general PTY/session
  manager.
- **Which executables mneme actually invokes is app-level configuration,
  not part of this capability's contract** — same as `agent-server`'s
  tool dispatch being app-level logic on top of a generic primitive. This
  is a wider set than the original draft of this request assumed: a
  handful of built-in presets (Claude Code, Codex, Gemini CLI — each with
  its own known flags/output format mneme parses) **plus an open-ended
  custom entry**, where the user types in an arbitrary agent name and
  invoke command themselves, the same way Lazify lets a user register any
  tool by name + command. The capability doesn't need to know or care
  which of these it's running — it's the same "spawn this argv array,
  stream stdout" call either way — but chain-sdk should know the caller
  isn't limited to a small fixed set: the executable name and args are
  fully caller-supplied at runtime, sourced from what the user typed into
  mneme's own settings, not a compiled-in constant. Whether chain-sdk
  wants to bake in its own restriction on top of that (e.g. refuse to
  spawn anything not on a caller-supplied allowlist) is chain-sdk's call,
  not assumed here — flagging the open-ended input so that decision is
  made with full context, not discovered later.

## Native module survey — macOS vs Windows

Unlike `http`/`storage` (portable by construction), this is genuinely
platform-divergent in one specific way, same shape as `platform`'s own
`#[cfg(target_os)]` precedent:

### macOS
- `std::process::Command::new("claude")` resolves through `PATH` the
  normal way — no known risk.

### Windows
- **Real, specific risk, not speculative:** globally-installed npm CLIs
  (which is how most people install `claude`/`codex`) are frequently
  `.cmd`/`.ps1` shim scripts on Windows, not a `.exe` — spawning those
  directly via `Command::new` without going through `cmd /c` or
  resolving the actual shim can fail silently or not launch at all. This
  needs explicit verification against a real Windows install with the
  CLI actually installed via npm, not just a compile-time check — the
  same "no single-platform-stable claim" rule `agent-server`'s Windows
  section flagged as still-open applies here too.

### Shared
- Streaming stdout incrementally (not buffering to EOF) is standard
  behavior for both platforms' process APIs — no divergence expected
  there specifically.

## Usage/statistics tracking and session persistence — why these aren't in this request

The user also asked for per-agent usage/statistics (Lazify tracks this
per agent) and for mneme to own a conversation's lifetime itself ("save
the session until the user deletes it or it reaches its time limit"),
not rely on whatever a CLI's own local session files do. Both are
covered here only to explain why neither shows up as a capability ask:

- **Usage/stats** is parsing of the exact same stdout stream this request
  already covers — Claude Code's `result` event includes `usage` and
  `total_cost_usd` fields mneme reads and stores itself; a custom agent
  with no known output shape still yields invocation count and wall-clock
  duration for free from process start/end. All of this is app-level
  aggregation into mneme's own `desktop.storage`, not a new capability.
- **Session persistence/retention** is mneme keeping its own record (
  conversation, messages, which agent, timestamps) in `desktop.storage`
  — already-existing capability — rather than depending on each CLI's
  own `~/.claude/projects/...` -style files, which mneme doesn't control
  and shouldn't assume will still be there later. Also purely app-level.

Neither needs anything from chain-sdk beyond the spawn/stream/kill
capability already requested above.

## Suggested next step for chain-sdk

Per rule 1: draft `capabilities/process-runner/CONTRACT.md` +
`contract.ts` for the spawn/stream/kill shape above before
implementation. Worth deciding early, same as `agent-server`'s design
fork: does this capability know it's "for AI CLIs" at all, or is it a
fully generic "run a command, stream stdout" primitive with zero
awareness of Claude Code/Codex specifically (mirroring how `agent-server`
has zero MCP/JSON-RPC awareness) — the latter keeps chain-sdk decoupled
from a specific AI vendor's CLI conventions, which seems like the
established pattern here.
