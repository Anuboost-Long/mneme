# Capability Request 31 — Indexes on an expression

Source: mneme's indexing pass (2 October 2026).

## The problem

`@Index` only takes column names; `chain migration` quotes each one, so an
index on an expression (`COALESCE(opened_at, updated_at)`,
`title COLLATE NOCASE`, `date(created_at)`) can't be declared. mneme hit
this with Home's "Last opened" sort: it worked around it by backfilling
`opened_at` and adding an insert trigger (migration 0029) so a plain
column index could serve the sort. Two sorts still scan every page:

- Home's "Title" sort: `ORDER BY page.title COLLATE NOCASE`.
- AI profiles: `ORDER BY name COLLATE NOCASE`.

## What's asked for

Let a class-level `@Index` take expressions, e.g.
`@Index({ name: "page_title_nocase", expressions: ["title COLLATE NOCASE"] })`,
emitted unquoted in `CREATE INDEX` and diffed like any other index in
`.model.json`. A per-column `collate` option would cover the NOCASE cases
on their own. The exact shape is chain-sdk's contract decision.

## What mneme will do with it

Add `page(title COLLATE NOCASE)` and `ai_profile(name COLLATE NOCASE)`,
and confirm with `EXPLAIN QUERY PLAN` that both sorts use them.
