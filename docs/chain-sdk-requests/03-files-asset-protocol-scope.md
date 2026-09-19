# Fix Request 3 — `files` capability's `asset://` URLs never load

Source: follow-up to `02-files.md`. The capability itself
(`desktop.files.write/read/url/delete`) is implemented and confirmed
correct — this is the one remaining piece blocking it from actually
working in a running app.

**This is blocking, not a "later phase" item** — until this lands, mneme
cannot ship the `desktop.files`-backed image storage that `02-files.md`
was written for. Please treat as a fix, not a backlog item.

## What's broken (verified live, not a guess)

Tested in mneme's actual running dev window (not a unit test): pasted a
real PNG into the editor via a genuine paste event.

- `desktop.files.write()` and `desktop.files.url()` both worked exactly
  as documented — the file landed on disk at
  `~/Library/Application Support/dev.chain.mneme/files/d3a92d71a9dd6e6c.png`
  and the returned `src` was a well-formed
  `asset://localhost/%2FUsers%2F.../files/d3a92d71a9dd6e6c.png`.
- The `<img>` never renders it. `img.naturalWidth`/`naturalHeight` are
  both `0` after load. A direct `fetch(img.src)` from the page throws
  `TypeError: Load failed` — WebKit's signature for a custom URL scheme
  handler refusing the request outright (not a 404, not a JS-side bug in
  the SDK wrapper or in mneme's usage of it).

## Root cause

Tauri v2's asset protocol is **disabled by default** and requires an
explicit allowlist before it will serve anything through
`convertFileSrc()`:

> To allow paths through the asset protocol, you must set `enable` to
> `true` and define a `scope` that lists which filesystem paths may be
> exposed, in `app.security.assetProtocol` in `tauri.conf.json`.
> ... Paths resolved at runtime must match that scope, or the WebView
> will refuse the load.
> — [Asset protocol scope | Tauri](https://v2.tauri.app/security/asset-protocol/)

Checked mneme's `.chain/native/tauri.conf.json`: there is no
`assetProtocol` key at all (so `enable` defaults to `false`), which is
sufficient on its own to explain the failure regardless of CSP.
`security.csp` is already `null` (no CSP injected at all), so that part
isn't an additional blocker here — no CSP directive to violate.

## The fix

Add, to `app.security` in `tauri.conf.json`:

```json
"assetProtocol": {
  "enable": true,
  "scope": ["$APPDATA/files/*"]
}
```

`$APPDATA` is Tauri's path variable for exactly the directory
`app_handle.path().app_data_dir()` resolves to at runtime — the same
call both `storage` and `files` already use
([path variables reference](https://v2.tauri.app/reference/javascript/api/namespacepath/)),
and `files/` is the exact subdirectory `crates/core/src/files.rs` opens
(`dir.join("files")`, per the capability's own README). A flat `*` is
enough — `Files` never creates nested subdirectories under it.

## Where this needs to live

Not an app-level fix — `tauri.conf.json` is one of `scaffold.ts`'s
tracked/patched files (`patchTauriConf` already handles
`frontendDist`/`beforeDevCommand`/`beforeBuildCommand`; `TRACKED_FILES`
in `src/scaffold.ts`). Every app with the `files` capability needs this,
so it belongs in that same patch path, propagated to existing apps via
`chain update` — not something each app hand-edits, per the same
reasoning `patchTauriConf` already follows for its other entries.

Two candidates, whichever fits the existing patch shape best:
- Extend `patchTauriConf` itself to always add this (`files` ships to
  every app already, per `agent-docs/capabilities/files/README.md`'s
  "every already-scaffolded app gets this automatically via `chain
  update`" claim — so this isn't conditional on anything).
- Or a new `patchAssetProtocolScope` alongside it if keeping concerns
  separate reads better — your call on `scaffold.ts`'s existing style.

## How to verify it's actually fixed

Don't just check the config diff — repeat the exact repro above (or
similar): run mneme (or `apps/playground`) via `chain dev`, paste a real
image into a `PageEditor`, and confirm `img.naturalWidth > 0` after load
(a `chain inspect --eval` one-liner is enough — no devtools needed). A
`fetch(img.src)` resolving instead of throwing is the other quick
signal. Update `agent-docs/capabilities/files/AGENTS.md`'s status once
this is actually confirmed rendering, not just configured.
