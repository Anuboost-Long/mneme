# Capability Request 26 — Typed queries (the ORM's query half)

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 3
"Add the ORM". It's the only Phase 3 item still open.

The modeling half already exists in chain-sdk: `@Table` classes from
`@chain/sdk/schema`, plus `chain migration add` generating migrations
from them (request 1 follow-up, 28 September 2026). The query half does
not. The storage CONTRACT.md says so under Non-goals: "No ORM and no
query builder … Query mapping stays out." This request asks to lift that
non-goal.

## Why mneme needs it now (rule 7)

mneme has 121 `desktop.storage.query`/`execute` call sites across its
feature `lib/` files. The same problems repeat in every table's file:

- **Column names are unchecked strings.** Renaming a property on a
  `@Table` class and running `chain migration add` gives no compile error
  at `"SELECT … WHERE bookmarked = ?"`. The break only shows at runtime.
- **Partial updates are hand-built every time.** `updateCourse`,
  `updateModule`, `updatePage`, … each push `"field = ?"` strings and
  values into two parallel arrays, then join them. Optional filters
  (`getCourses({ status, bookmarked, createdFrom })`) are built the same
  way.
- **Insert-then-reread.** Every `create*` runs `execute`, then a second
  `SELECT` by `lastInsertId` to get the row back.
- **No transactions.** `deleteCourse` removes pages, modules, recordings,
  audio and the course in separate calls. If one fails partway, the rest
  are left half deleted. The contract's own non-goal names this: "add one
  … only when a real app needs multi-statement atomicity". This is that
  app.

## What's asked for

A typed query API built from the existing `@Table` classes, in the
spirit of EF Core's `DbSet`, since the schema side already follows
`dotnet ef`. The exact shape is chain-sdk's contract decision (rule 1).
The rough outline mneme would use:

```ts
const courses = desktop.storage.table(Course);

await courses.where({ bookmarked: 1, status }).orderBy("position", "created_at").all();
await courses.find(id);                        // row | undefined
await courses.insert({ name, position });      // returns the inserted row
await courses.update(id, { description });     // only the given columns
await courses.delete({ course_id: id });       // returns rowsAffected

await desktop.storage.transaction(async (tx) => {
  await tx.table(Page).delete({ module_id });
  await tx.table(Module).delete({ id: module_id });
});
```

What matters to mneme:

- Column names and value types checked at compile time against the
  `@Table` class. `@NotMapped` properties are excluded.
- `where` takes equality objects for the common case. There's a clear
  escape hatch for the rest (`date(created_at) >= date(?)`, `IN (…)`,
  `LIKE`, `COALESCE(MAX(position), 0) + 1`), such as a raw SQL fragment
  with bound params. `query`/`execute` stay as they are.
- Values are always bound, never interpolated (the same rule as today).
- A `transaction()` that rolls back if the callback throws.
- Joins and relation loading aren't needed now. mneme's list queries
  that join (page counts per module, progress per course) can stay raw
  SQL.

This looks like pure TypeScript in `packages/sdk` on top of
`query`/`execute`, plus a native `transaction` if one can't be expressed
through the existing single-statement calls. The CLI would need no
changes, since it reads the same classes.

## What mneme will do with it

Move the course, module and page `lib/` files onto `table(...)` first,
and wrap `deleteCourse`/`deleteModule`/`deletePage` in a `transaction`.
The other features move over as they're touched. The app-facing mapping
(`bookmarked` 0/1 to `boolean`, numeric columns to TS enums) stays in
mneme's `lib/` files.

## Please update in mneme when done

Update mneme's `@chain/sdk` and the storage CONTRACT.md (drop the "No
ORM" non-goal), then signal the mneme session.
