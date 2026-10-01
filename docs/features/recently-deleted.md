# Recently deleted

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 3 "Add
soft delete support if needed". Asked for on 1 October 2026: deleted
courses, modules and pages go to a screen where the user can preview
them, then restore them or delete them permanently.

Decisions made with the user:

- Courses are included, not only modules and pages.
- Items are kept for 30 days, then purged.
- Permanently deleting a parent deletes its children too, including
  children that are listed separately.

## Data model

`course`, `module` and `page` each have a `deleted_at` column (migration
0026). NULL means live.

Deleting stamps the item **and every live row inside it** with the same
value (`deleteCourse`, `deleteModule`, `deletePages`, each in one
`desktop.storage.transaction`). Two things follow from that:

- **Reads stay simple.** A live page always has a live module and course,
  so each query only checks its own table's `deleted_at IS NULL`. It
  never has to look at ancestors.
- **The shared value is the link.** A row "was deleted with" its parent
  when their `deleted_at` values are equal. A page deleted on its own
  earlier keeps its own, different value, so it isn't restored along with
  the module later.

`deletionTime()` (in `features/courses/lib/pages.ts`) returns a UTC
timestamp in milliseconds, forced to increase strictly within the app.
This matters: the tests caught a page and its module being deleted in
the same millisecond, which made the page look like it was deleted with
the module.

Nothing is deleted from disk when an item is soft-deleted. Covers,
recordings, attachments and page audio stay until a permanent delete.

## What's listed

`getDeletedItems()` lists what the user deleted:

- every deleted course;
- a deleted module whose course isn't deleted with the same value;
- a deleted page whose module isn't deleted with the same value.

Courses show their module and page counts, and modules their page count,
counting only what was deleted with them. Days left are 30 minus whole
days since `deleted_at`.

## Preview

Selecting a row opens it in place, one at a time, like Recordings.

- A page shows its stored HTML, using the editor's `page-editor-content`
  styles (the same way Module highlights shows stored HTML). Recording
  and attachment blocks are editor-only placeholders, so they don't
  appear in the preview.
- A module lists its pages, with a one-line text preview of each.
- A course lists its modules, then the pages in each.

## Restore

`restoreItems()` runs in one transaction. Each item comes back with
everything deleted with it (the same `deleted_at`). If the item sits in a
deleted module or course, that parent row is restored too, but not the
parent's other contents, so the item has somewhere to be. Those other
contents keep their old `deleted_at`, and since it no longer matches the
now-live parent, they show up as separate items. The route re-adds
restored courses to the sidebar through `useCourses().save`.

## Permanent delete and purge

`eraseItems()` uses the hard delete that existed before soft delete
(`eraseCourse`, `eraseModules`, `erasePages`): files first, then rows.
Erasing a course erases every module and page in it, and erasing a
module erases every page in it, whether or not they're listed separately.
This part isn't in a transaction, because deleting files goes through
`desktop.files` and can't be rolled back.

`purgeExpiredItems()` runs at startup in `RootLayout`, after
`cleanUpConversations`, and erases every listed item that has 0 days
left.

Other deletes are still hard deletes, for example the new page that
Home's recorder removes when saving fails (`erasePages`), a recording on
its own, an AI action or a widget.

## Everywhere that skips deleted rows

- **Course, module and page libs:** lists, single reads, counts, search,
  links, progress, move destinations.
- **Home dashboard:** every query, including library counts, which also
  leave out recordings and attachments of deleted pages.
- **Other screens:** Recordings, module highlights, backup export.
- **Agent tools and AI action context:** covered through the libs.

Any new query on these tables needs the same filter.

## Tests

`tests/recently-deleted.test.mjs`:

- hiding everywhere;
- what's listed;
- both restore rules;
- permanent delete removing files;
- parents taking separately listed children with them;
- the preview queries;
- the 30-day purge.

Verified in the running app on 1 October 2026: delete through the
normal dialogs, preview, restore, permanent delete (including files on
disk), the purge at startup, and the list surviving a restart.
