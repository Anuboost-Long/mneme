# Capability Request 5 — Reclaim disk space after deletes

Source: user report — "when deleting a page don't just soft delete it,
hard delete it, we need space."

## mneme's own delete calls are already hard deletes

Checked `src/features/courses/lib/pages.ts` (and the equivalent
`courses.ts`/`modules.ts`): every delete is a real
`DELETE FROM <table> WHERE id = ?` (or `WHERE id IN (...)` for the new
bulk delete). There is no `deleted_at`/`is_deleted` column anywhere in
`src/shared/lib/db/schema` or any migration — rows are actually removed
from their table the moment `deletePage`/`deletePages` resolve. There is
no soft-delete flag to remove; this is not an app-level bug.

## What's actually happening (verified live, not a guess)

Deleting rows doesn't shrink the SQLite **file** — that's normal SQLite
behavior, not specific to mneme. Checked mneme's real dev database after
a round of test imports/deletes:

```
$ ls -la ".../dev.chain.mneme/app.db"*
-rw-r--r--  421888  app.db
-rw-r--r--   32768  app.db-shm
-rw-r--r-- 4181832  app.db-wal      <- 10x the main file

$ sqlite3 app.db "PRAGMA auto_vacuum; PRAGMA page_count; PRAGMA freelist_count;"
0     <- auto_vacuum = NONE (SQLite's default, never set)
103   <- total pages in the file
55    <- of which over half sit on the free list, unused
```

Two separate causes, both native/storage-capability-level, neither
fixable from `src/features/courses/lib/*`:

1. **No `auto_vacuum`.** `crates/core/src/storage.rs`'s `Database::open`
   sets `PRAGMA journal_mode = WAL` but never touches `auto_vacuum`, so it
   stays at SQLite's default (`NONE`). Freed pages from a `DELETE` go on
   an internal freelist for the *same file* to reuse later — they're
   never handed back to the OS. Only `VACUUM` (a full file rewrite) or
   `auto_vacuum = INCREMENTAL`/`FULL` actually shrinks the file, and
   `auto_vacuum` only takes effect on a fresh database or after a `VACUUM`
   — it can't just be flipped on for existing installs.
2. **The WAL file itself grows unbounded** (4.18MB vs. a 421KB main file
   above) because nothing ever checkpoints it. WAL mode is the right
   choice for concurrent-read durability (per this crate's own doc
   comment), but without periodic `PRAGMA wal_checkpoint(TRUNCATE)` the
   `-wal` file just keeps growing regardless of how many rows get
   deleted — this alone can dwarf the actual data on disk.

## What mneme needs

A way for the actual on-disk footprint to shrink after deletes, not just
the logical row count. Exact mechanism is chain-sdk's contract call (rule
2) — plausible shapes, roughly in order of how much they cost:

- Set `auto_vacuum = INCREMENTAL` on `Database::open` for **new**
  databases, and expose something like `desktop.storage.vacuum()` (or run
  `PRAGMA incremental_vacuum` automatically after deletes cross some
  threshold) so already-existing installs — like mneme's own dev
  database above — can actually reclaim the space they're already
  holding, not just future ones.
- Checkpoint and truncate the WAL periodically (e.g.
  `PRAGMA wal_checkpoint(TRUNCATE)` after `execute()` calls that
  delete/update meaningfully, or on an idle timer) so the `-wal` file
  doesn't grow into the multi-MB range on a database with a few hundred
  rows in it.

**No new app-facing behavior beyond that** — mneme doesn't need a
"clean up disk space" button or a settings toggle for this (no
speculative scope, rule 7); the expectation is that deleting things just
doesn't leave the file bloated, the same way it wouldn't in any other
desktop app.

## Where this needs to live

`crates/core/src/storage.rs`'s `Database::open`/`execute`, not
`mneme`'s app code — `desktop.storage.execute()` already does the right
thing (a real `DELETE`); what's missing is entirely on the SQLite-file
side of that call, which mneme has no access to.

## How to verify it's actually fixed

Repeat the exact repro above against a real app database: import a bunch
of pages, bulk-delete them, then check `PRAGMA freelist_count` (should
trend toward 0, not stay near half of `page_count`) and the `-wal` file's
size (shouldn't grow past a few hundred KB at rest). Checking the pragma
value on a freshly-created empty database only proves the setting was
applied, not that it actually reclaims space on a database that already
has bloat — verify against mneme's real dev database, not a fresh one.
