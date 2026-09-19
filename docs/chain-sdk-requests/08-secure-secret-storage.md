# Capability Request 8 — Secure storage for an API key

Source: same roadmap phase as `07-http-post.md` — Phase 19 ("Basic AI
Integration")'s own development steps explicitly separate these two
needs: "Add API key settings." then, as its own line, "**Store keys
securely.**"

## Why this is next

Checked what "storage" mneme actually has today: `desktop.storage` is
plain SQLite (`crates/core/src/storage.rs`) with no encryption at rest —
confirmed in `05-storage-space-reclaim.md`'s own inspection of the real
`app.db` file, and nothing about that capability's contract claims
encryption. There's no `desktop.secrets`/keychain-style capability at all
— checked `capabilities/` (`files`, `http`, `platform`, `storage`) and
`crates/core/src/` (`files.rs`, `http.rs`, `platform.rs`, `storage.rs`);
none of them touch OS-level credential storage.

An AI provider API key is a live, billable credential a user pastes into
Settings — materially different from course/module/page content, which
is why the roadmap calls out "store keys securely" as its own explicit
step rather than assuming the existing database is enough. Writing it as
a plain SQLite column (the only storage mneme has today) would mean:

- It sits in cleartext in `app.db`, readable by anything that can open
  that file (confirmed above — no encryption).
- It's included whenever `Backup.tsx`'s `createBackup()`/`downloadBackup()`
  dumps `SELECT * FROM ...` tables to a portable JSON file the user
  explicitly downloads and might share/back up elsewhere — a real,
  concrete leak path this app already has, not a hypothetical one.

Both point to the same conclusion: this needs to live somewhere SQLite
(and therefore the backup export) never sees it — the OS's own credential
store.

## What mneme needs

A minimal secret store: save one named secret, read it back, delete it.
Exact shape is chain-sdk's contract call (rule 2), but at minimum:

- `set(key: string, value: string)`, `get(key: string): string | null`,
  `delete(key: string)` — enough for "one API key per provider," which is
  all Phase 19 ("Start simple") actually needs. No secret *listing*, no
  multi-value/struct secrets, no expiry — speculative beyond what's asked.
- Value never round-trips through `desktop.storage` (SQLite) or
  `desktop.files`, and therefore never appears in a `createBackup()`
  export — that's the entire point of this being a separate capability
  rather than "just add a column."
- Scoped to this app only (whatever the platform's normal app-identity
  scoping for its credential store is) — not a shared/system-wide secret.

## Native module survey — macOS vs Windows

Unlike `http`/`storage`/`files`, this is genuinely platform-divergent —
same shape `platform.rs`'s own `#[cfg(target_os)]` branching already
established as normal for this kind of capability:

### macOS
- The system Keychain (`Security.framework`) is the standard, expected
  place for this — accessible from Rust via the `security-framework`
  crate (a thin, well-established binding), no shelling out to the
  `security` CLI needed.

### Windows
- Windows Credential Manager (`wincred` APIs) is the equivalent — the
  `windows` crate (already a natural dependency on Windows-targeted Rust)
  or a small wrapper crate covers this.

### Shared
- Both platforms have a first-party, OS-provided secret store — this
  isn't a "portable-by-construction, no per-OS branching" capability like
  `http`/`storage` were; it's a "two different OS APIs behind one
  interface" capability like `platform` already is. Worth confirming
  cross-platform behavior explicitly once implemented (rule 3), same as
  `platform`'s own precedent.

## Suggested next step for chain-sdk

Per rule 1 (contract first): draft `capabilities/secrets/CONTRACT.md` +
`contract.ts` for the `set`/`get`/`delete` shape above, then implement via
whichever of `security-framework` (macOS) / a Credential Manager binding
(Windows) fits chain-sdk's existing crate conventions.
