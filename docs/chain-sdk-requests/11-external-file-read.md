# Capability Request 11 — Read-only access to a caller-given file outside mneme's own sandbox

Source: discovered while checking how Lazify (also installed on this
machine, used as the reference for "mneme should track agent usage the
same way") actually implements per-agent usage/statistics — not
anticipated by the original `10-subprocess-runner.md` request. See
`docs/features/19-agent-chat.md`'s "Usage/statistics" section.

## Why this is needed (verified against real local data, not assumed)

Read Lazify's own `~/Library/Application Support/lazify/agent-usage-cache.json`
directly. It does **not** derive usage stats by wrapping/parsing the
stdout of processes it spawns itself — it reads each agent CLI's own
local session transcript files, incrementally, tracking how far it's
already read per file:

```json
{
  "agents": {
    "claude": {
      "/Users/x/.claude/projects/<project>/<session-id>.jsonl": {
        "size": 11892792, "mtimeMs": 1788819731805.0, "offset": 11892792,
        "daily": { "2026-09-06": { "input": 764, "output": 299684,
          "cacheRead": 72602220, "cacheWrite": 607899, "messages": 383 } }
      }
    },
    "codex": {
      "/Users/x/.codex/sessions/2026/09/07/rollout-2026-09-07T00-02-43-<uuid>.jsonl": { "...": "..." }
    }
  }
}
```

Confirmed the actual paths exist on this dev machine: Claude Code writes
to `~/.claude/projects/<project-slug>/<session-id>.jsonl`, Codex writes to
`~/.codex/sessions/<yyyy>/<mm>/<dd>/rollout-<timestamp>-<uuid>.jsonl`. This
is why the number is meaningful — it counts **all** of the user's usage
of that agent (any terminal, not just sessions Lazify or mneme started),
which is what "mneme should track usage the same way" actually requires.

## Why this needs a new capability

Checked `desktop.files`' actual contract before writing this:

```ts
export interface FilesApi {
  write(bytes: Uint8Array, options?: { extension?: string }): Promise<string>;
  read(reference: string): Promise<Uint8Array>;
  url(reference: string): Promise<string>;
  delete(reference: string): Promise<void>;
}
```

`read()` only accepts a `reference` that `write()` itself generated —
it's scoped entirely to files mneme wrote into its own app-data
directory (`02-files.md`'s whole premise). `~/.claude/projects/...` and
`~/.codex/sessions/...` are files mneme never wrote, living under the
user's home directory in *other tools'* own data folders — structurally
outside what `files` can reach, not just a missing method on it.

## What mneme needs

Two things, read-only, that `files` doesn't provide:

1. **List files under a directory**, so mneme can discover which
   transcript files exist for a given agent (Claude Code's structure is
   `~/.claude/projects/*/*.jsonl` — a wildcard directory level mneme
   can't enumerate without a real directory read).
2. **Read a byte range of a file, not just the whole thing.** Lazify's
   own `{size, mtimeMs, offset}` tracking exists specifically to avoid
   re-reading multi-megabyte transcript files on every check — one file
   in the real cache above is ~12MB. Reading the whole file every scan
   would work but defeats the purpose of incremental tracking; a
   from-offset partial read is the actual ask.

Exact shape is chain-sdk's contract call (rule 2), but at minimum:
`listFiles(directory, pattern?) -> string[]` and
`readFrom(path, offset) -> { bytes, newOffset, size, mtimeMs }` (or
equivalent) — mneme stores the returned offset/size/mtime itself
(`agent_usage_source` in the feature doc) and only asks for what's new
next time.

## This is a meaningfully bigger trust boundary than prior requests — flagging explicitly

Every capability so far either stays inside mneme's own sandboxed app-data
directory (`storage`, `files`) or is a bounded, generic OS primitive with
no filesystem reach of its own (`http`, `agent-server`, `process-runner`).
This one reads arbitrary caller-given paths under the user's home
directory, into other applications' own data. That's a real increase in
scope, not a detail:

- **Read-only is a hard requirement** — no write/delete/rename on
  anything reached this way, ever. mneme has no business modifying
  another tool's own session files.
- Whether chain-sdk wants to scope this to a caller-supplied allowlist of
  path *patterns* (e.g. only under `~/.claude/`, `~/.codex/`, explicitly
  not `$HOME` at large) rather than a fully open "read any path" primitive
  is exactly the kind of decision this flag is for — mneme's own use of
  this only ever needs a small, known set of per-agent transcript
  directories, never arbitrary user-chosen paths, so a narrower contract
  than "read anything" would still fully satisfy the actual need.
- No prompt/consent UI is assumed here one way or the other — that's
  chain-sdk's call given the trust-boundary shift, not assumed by mneme's
  side of this request.

## Native module survey — macOS vs Windows

Portable in the same way `files.rs` already is — `std::fs` directory
listing and reads work identically on both platforms:

- Shared: no per-OS branching expected for the read/list mechanics
  themselves.
- Home-directory resolution (`~/.claude/...`) needs the same portable
  expansion `storage`/`files` already use for `app_data_dir()` — not a
  new problem, just needs doing consistently here too.
- No known platform-specific risk beyond what any file-read capability
  would already have (permissions, the file being mid-write by another
  process when mneme reads it — worth a `research/` note on whether a
  partial-line read at the tail of an actively-appended `.jsonl` file
  needs any guard, e.g. only counting complete lines).

## Suggested next step for chain-sdk

Per rule 1: draft `capabilities/external-files/CONTRACT.md` (or fold
into an extended `files` contract if that reads better — genuinely
unsure which fits chain-sdk's existing conventions best, flagging rather
than assuming) covering the list + offset-read shape above, including a
decision on the allowlist-vs-fully-open question raised above, before any
implementation.
