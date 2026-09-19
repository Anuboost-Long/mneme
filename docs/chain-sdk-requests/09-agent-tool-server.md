# Capability Request 9 — Local server so AI agents can call mneme as tools

Source: user correction, replacing `07-http-post.md` and
`08-secure-secret-storage.md` (now deleted — see below). Roadmap-wise this
is Phase 25 ("AI Agent Tools" — `read_page`, `read_module`,
`search_workspace`, `create_page`, `update_page`, `insert_blocks`,
`move_page`, ...), not Phase 19 ("Basic AI Integration").

## Why the previous two requests are withdrawn

`07`/`08` assumed Phase 19 meant "mneme embeds a chat UI that calls out to
Anthropic/OpenAI with a user-pasted API key" — hence asking for outbound
HTTP `POST` and secure key storage. The user corrected this directly: the
actual goal is the other direction — **external AI agents (Claude Code,
Claude Desktop, any MCP-compatible client) should be able to call into
mneme** to read and act on the user's own courses/modules/pages, not
mneme calling out to a model provider. Under that model mneme never sends
a request to an AI provider and never holds an API key, so both requests
are moot. Deleted rather than left stale in this folder.

## Why this needs a new capability, not app code

The `read_page`/`create_page`/etc. tool implementations themselves are
plain app-level logic mneme already has — `getPage`, `createPage`,
`getPages`, `getModules`, `getCourses` in `src/features/courses/lib/*.ts`
already do exactly what those tools need. The gap is entirely about how
an **external, separate process** (an AI agent, running outside the
webview) reaches them at all:

- Those functions run inside the Tauri webview and only get invoked by
  React event handlers today. An external process has no way to call
  into a webview's JS from outside it.
- A browser/webview has no API to open a listening socket or run an HTTP
  server — this is squarely native/OS territory (same reasoning as every
  prior request here: mneme's own rule is to never reach for a native API
  directly, `AGENTS.md`), so it has to be a chain-sdk capability, not
  something worked around in app code.

## What mneme needs

A way to run a local server, bound to `127.0.0.1` only (never `0.0.0.0` —
this must not be reachable from the network, only from the same
machine), that forwards each incoming request to a JS-side handler and
sends back whatever that handler returns. Exact shape (raw HTTP the app
routes itself vs. chain-sdk speaking the MCP transport directly, which
port — ephemeral vs. a fixed one the user can see in Settings, one server
per app run vs. start/stop control) is chain-sdk's contract call (rule 2),
but at minimum:

- Native side owns the actual socket/HTTP server and the OS-level
  concerns (binding, keeping it local-only).
- JS side registers one handler that receives each request (method,
  path/tool name, body) and returns a response asynchronously — the
  handler is where mneme's own `read_page`/`create_page`/etc. functions
  actually get called; that dispatch logic is app-level, not part of this
  capability.
- **No built-in auth/permission model beyond "local-machine-only" is
  being asked for here** — Phase 28 ("Agent Permission System") is a
  separate, later roadmap phase (approval dialogs, trusted permissions,
  confirming destructive actions); this request is scoped to "can a local
  process reach mneme's data at all," not the safety layer on top.

## Prior art already in this codebase

`chain-dev-inspector`'s `dev_inspector.rs` already implements almost
exactly this shape, for a different purpose: a native `TcpListener`
accepts connections, forwards each request to the webview via
`window.eval()`, and blocks on an `mpsc` channel until the JS side calls
back through `__chain_inspector_report` with the result (see
`run_eval` in that file). That proves the "native listens, JS handles,
native replies" round trip already works in this exact app shell — this
request is asking for the same shape, generalized and shipped for
release builds instead of gated behind `chain-dev-inspector` and limited
to raw `eval`.

## Native module survey — macOS vs Windows

Portable in the same way `http`/`storage` are — an HTTP server is a
portable operation once built in Rust (e.g. via a lightweight server
crate), no per-OS branching expected:

- Shared: binding to `127.0.0.1` and refusing external interfaces is a
  portable, deliberate choice on both platforms, not something either OS
  does differently.
- No known platform-specific risk on either macOS or Windows — worth a
  quick explicit check once implemented (rule 3), same as every prior
  capability's survey, but nothing anticipated here.

## Suggested next step for chain-sdk

Per rule 1: draft `capabilities/agent-server/CONTRACT.md` + `contract.ts`
for the shape above before implementation — same process as `http`/
`storage`/`files`. Worth deciding early whether this should speak MCP's
actual wire protocol (so any MCP client works with zero glue) or a
simpler custom protocol mneme translates to/from MCP itself app-side —
that's a real design fork, not a detail to leave implicit.
