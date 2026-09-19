# Capability Request 4 — Fetch an External Page (LMS Import)

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 10 ("LMS
Import") and Recommended MVP item 10 ("Basic LMS Page Import").

One phase at a time, same as requests 1–3 — this covers only fetching a
public page's raw HTML. Phase 11 ("Authenticated LMS Pages" — login
sessions, cookies, a dedicated LMS browser window) is a separate, later
capability need and is explicitly out of scope here; Phase 10 itself only
targets pages that don't require login.

## Why this is next

Current progress: Courses/Modules/Pages (Phases 4–6), the rich text
editor with slash commands (Phases 7–8), and the `desktop.files`-backed
image storage from requests 2–3 are built and working (image paste/drop
now writes real files instead of base64, verified against the
asset-protocol fix). Per the roadmap's own Recommended MVP order, item 10
(Basic LMS Page Import) is next, directly after item 9 (Image Import).

- **Parsing an HTML string needs no new capability.** Once the raw HTML
  text is in hand, `DOMParser` (a plain Web API already available in the
  webview) is enough to extract headings/paragraphs/lists/links, matching
  Phase 10's "Parse page HTML" step.
- **What's actually missing is retrieving that HTML in the first place.**
  Phase 10's "Open or request the page" / "Retrieve HTML" steps mean
  fetching an arbitrary external URL (e.g. `https://school.edu/...`) that
  the user pastes in. A plain `fetch()` from the webview is subject to
  the same CORS restrictions as any browser page: the webview's own
  origin (`tauri://localhost` / `http://localhost:1420` in dev) is
  cross-origin from the target LMS domain, and ordinary server-rendered
  course pages don't send `Access-Control-Allow-Origin` for arbitrary
  origins. In practice `fetch()` on a real LMS URL fails outright — this
  is a genuine native-OS-adjacent need (making the HTTP request outside
  the webview's origin, native-side, the same way Tauri's own
  `@tauri-apps/plugin-http` exists to solve exactly this), not something
  achievable with a different Web API, matching mneme's rule to never
  touch a native/OS API directly (see mneme `AGENTS.md`).

## What mneme needs

A capability (name TBD by chain-sdk, e.g. `desktop.http`) for making a
simple outbound HTTP GET request from native code and returning the
response to the app:

- Given a URL, request it and return the response body as text (the raw
  HTML), plus enough to detect failure (e.g. a non-2xx status) — exact
  shape (status/headers included or not, error normalization) is a
  chain-sdk contract decision, not assumed here (rule 2).
- **No cookies, no sessions, no auth headers, no redirected-request
  inspection** — Phase 10 is explicitly public-page-only; that
  complexity belongs to the later Phase 11 request when we get there, not
  this one (rule "one phase at a time" / rule 7, no speculative scope).
- **No response caching, no concurrent-request queueing, no streaming** —
  a single page is small HTML text; each of these would be speculative
  until a real need shows up.

mneme's own use of this (the "Import Module" URL input, HTML parsing,
content-type detection, and building pages from the parsed result) is
app-level logic on top of this and is not part of the capability itself.

## Native module survey — macOS vs Windows

Like `storage`/`files`, this doesn't need per-OS native code — an HTTP
GET is a portable operation once made from Rust rather than the webview.
What differs is platform convention and known risk, not implementation:

### Shared (identical on both platforms)
- Rust: an HTTP client crate (e.g. `reqwest`) making the GET request
  server-/native-side and returning the body to the app via a Tauri
  command — the same "custom command, no plugin ACL needed" approach
  `files` already established, per that capability's README.
- No filesystem/app-data-directory involvement at all, unlike `storage`
  and `files` — this capability is pure network I/O, nothing to scope in
  `tauri.conf.json`.

### macOS-specific
- No known platform-specific risk. TLS is handled by whichever backend
  `reqwest` is built with (`rustls` avoids relying on the system's
  security framework at all, which is likely the simpler default here).

### Windows-specific
- Known risk to verify explicitly (chain-sdk rule 3, no single-platform
  contracts): corporate/managed Windows machines sometimes intercept
  outbound HTTPS via a proxy or a locally-installed root certificate
  (school-managed laptops are a plausible real case for this app's actual
  users). Worth a `capabilities/http/research/WINDOWS.md` note on
  whether `reqwest`'s default TLS backend respects the Windows
  certificate store or needs `rustls-tls-native-roots` instead, once this
  capability exists (rule 8).

## Suggested next step for chain-sdk

Per rule 1 (contract first): draft `capabilities/http/CONTRACT.md` +
`contract.ts` for the shape above before any `reqwest` wiring — same
process already used for `platform`, `storage`, and `files`.
