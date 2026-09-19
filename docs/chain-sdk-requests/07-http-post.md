# Capability Request 7 — Outbound HTTP POST (for calling an AI provider)

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 19 ("Basic
AI Integration") — the next unbuilt item in the roadmap's own Recommended
MVP order (items 1–10, ending with Image Import and Basic LMS Page
Import, are now done; items 11–12, Basic AI Chat and Summarize Page, are
Phase 19).

One phase at a time, same as prior requests — this covers only making a
single outbound HTTP request with a body and custom headers, mirroring
how `04-lms-page-fetch.md` scoped the original GET-only need. Streaming
responses (so a chat reply can appear token-by-token instead of all at
once) is explicitly **not** requested here — the roadmap's own guidance
for this phase is "Start simple... First make basic AI communication
reliable," and a non-streaming request is enough for that. Streaming is a
reasonable follow-up request once basic chat actually works, not
speculative scope to build now.

## Why this is next

Checked `capabilities/http/contract.ts`:

```ts
export interface HttpApi {
  get(url: string): Promise<HttpResponse>;
}
```

Only `get()` exists. Every mainstream AI provider's chat endpoint
(Anthropic's Messages API, OpenAI's Chat Completions, etc.) is a `POST`
with a JSON body and an `Authorization`/`x-api-key` header — `http.get()`
cannot make that call at all, regardless of CORS.

- **This still needs to be native, not a plain `fetch()`.** The same
  reasoning `04-lms-page-fetch.md` used for GET applies to POST: most AI
  providers do not send permissive CORS headers for arbitrary browser
  origins (in several cases deliberately, specifically to stop API keys
  from being shipped in client-side browser apps), so a renderer-side
  `fetch()` to e.g. `api.anthropic.com` would be expected to fail the
  same way a renderer-side GET to an arbitrary LMS page did.
- **Response shape needs a body, not just status.** `HttpResponse` today
  is `{ status, ok, body }`, which is already enough to carry a JSON
  response as text (mneme would `JSON.parse` it app-side, the same way
  `04`'s GET response is parsed as HTML app-side) — this request doesn't
  ask for a new response shape, only a new way to send a request.

## What mneme needs

A way to make a single outbound HTTP request with a method, custom
headers, and a body, returning the same `{ status, ok, body }` shape
`get()` already returns. Exact shape (one `request()` method covering all
verbs vs. an added `post()` alongside `get()`, how headers are passed) is
chain-sdk's contract call, not assumed here (rule 2):

- Caller-supplied headers (at minimum needs to set `Content-Type:
  application/json` and an auth header whose name varies by provider —
  `Authorization: Bearer ...` vs `x-api-key: ...` — so the header name
  itself must be caller-controlled, not hardcoded to one provider).
- Caller-supplied body (a JSON string mneme builds app-side, the same way
  `04`'s GET returns a body mneme parses app-side).
- **No response streaming, no SSE parsing, no timeout/retry policy
  beyond what `get()` already has** — explicitly out of scope for this
  request (see above).
- **No provider-specific logic of any kind belongs in this capability.**
  Which provider, which model, which JSON shape the body/response take,
  where the API key comes from — all of that is app-level logic mneme
  builds on top, exactly like `04`'s note that "mneme's own use of this
  ... is app-level logic on top of this and is not part of the capability
  itself."

## Native module survey — macOS vs Windows

Identical shape to `04-lms-page-fetch.md`'s survey, since this is the
same `reqwest`-based client doing one more HTTP method:

- Shared: `reqwest`'s client already supports arbitrary methods/headers/
  bodies — this is extending the same request-building code path
  `crates/core/src/http.rs`'s `get()` already has, not a new dependency
  or a new risk surface.
- No new macOS- or Windows-specific risk beyond what `04` already noted
  (TLS backend / corporate proxy interception) — POST doesn't change
  that.

## Suggested next step for chain-sdk

Extend `capabilities/http/CONTRACT.md` + `contract.ts` to add a request
method with a body/headers, then wire it through `crates/core/src/http.rs`
and the `http_get`-style Tauri command in `.chain/native/src/lib.rs`'s
template, the same path `04` already established for `get()`.
