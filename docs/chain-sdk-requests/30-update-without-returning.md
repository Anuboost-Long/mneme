# Capability Request 30 — Update or delete without returning rows

Source: mneme's move to typed queries (2 October 2026).

## The problem

`table().update()` always ends in `RETURNING *`, so every update sends
the changed rows back across IPC whether the caller wants them or not.
For mneme's `page` table that includes the whole HTML `content`:

- `setPageOpened` (every page open) only bumps `opened_at`, but receives
  the page's full content back.
- `softDeletePages` and Recently deleted's restore send back every
  affected page's content for bulk operations.

Content is text now that images are files, so each call is small, but
it's pure waste, and the alternative today is dropping back to raw
`execute()`, which mneme's own rules forbid.

## What's asked for

A way to run `update` (and ideally `delete`, which already returns only a
count) without returning rows, keeping the same typed `target`/`values`
checks. For example `update(target, values, { returning: false })`
resolving to `rowsAffected`, or a separate `updateOnly(target, values)`.
Choosing returned columns (`returning: ["id", "module_id"]`) would also
cover it. The exact shape is chain-sdk's contract decision.

## What mneme will do with it

Use it in `page/table.ts` (`setPageOpened`, `softDeletePages`,
`replacePageContent`), Recently deleted's restore, and any update whose
result is ignored.
