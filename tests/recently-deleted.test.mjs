import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useTestDesktop } from './support/desktop.mjs';

const { database, deletedFiles } = useTestDesktop();
const { initDb } = await import('../src/shared/lib/db/index.ts');
const { createCourse, getCourses, getCourse, deleteCourse } = await import('../src/features/courses/lib/courses.ts');
const { createModule, getModules, getModule, deleteModule } = await import('../src/features/courses/lib/modules.ts');
const { createPage, getPages, getPage, searchPages, deletePage } = await import('../src/features/courses/lib/pages.ts');
const { getLibraryCounts } = await import('../src/features/home/lib/dashboard.ts');
const { getDeletedItems, getDeletedPages, restoreItems, eraseItems, purgeExpiredItems, daysLeft } = await import('../src/features/recently-deleted/lib/recentlyDeleted.ts');
await initDb();

const listed = async () => (await getDeletedItems()).map(({ kind, name, modules, pages }) => `${kind}:${name}:${kind === 'course' ? `${modules}/` : ''}${pages}`).sort();

async function workspace(name) {
  const course = await createCourse({ name, cover: `${name}-cover` });
  const module = await createModule(course.id, { name: `${name} M1` });
  const other = await createModule(course.id, { name: `${name} M2` });
  const page = await createPage(module.id, { title: `${name} P1`, content: 'needle', cover: `${name}-page-cover` });
  const sibling = await createPage(module.id, { title: `${name} P2` });
  const elsewhere = await createPage(other.id, { title: `${name} P3` });
  return { course, module, other, page, sibling, elsewhere };
}

async function empty() {
  await eraseItems(await getDeletedItems());
  for (const course of await getCourses()) {
    await deleteCourse(course.id);
  }
  await eraseItems(await getDeletedItems());
}

test('a deleted page is hidden everywhere, listed, and restored with its files untouched', async () => {
  const { module, page } = await workspace('A');
  const before = await getLibraryCounts();
  await deletePage(page.id);
  assert.equal(await getPage(page.id), undefined);
  assert.ok(!(await getPages(module.id)).some(({ id }) => id === page.id));
  assert.deepEqual(await searchPages('needle'), []);
  assert.equal((await getLibraryCounts()).pages, before.pages - 1);
  assert.deepEqual(await listed(), ['page:A P1:0']);
  assert.deepEqual(deletedFiles, []);

  await restoreItems(await getDeletedItems());
  assert.equal((await getPage(page.id)).title, 'A P1');
  assert.deepEqual(await listed(), []);
  await empty();
});

test('a module lists once with its pages, and a page deleted before it stays deleted on restore', async () => {
  const { module, page, sibling } = await workspace('B');
  await deletePage(page.id);
  await deleteModule(module.id);
  assert.equal(await getModule(module.id), undefined);
  assert.equal(await getPage(sibling.id), undefined);
  assert.deepEqual(await listed(), ['module:B M1:1', 'page:B P1:0']);

  await restoreItems((await getDeletedItems()).filter(({ kind }) => kind === 'module'));
  assert.ok(await getModule(module.id));
  assert.ok(await getPage(sibling.id));
  assert.equal(await getPage(page.id), undefined);
  assert.deepEqual(await listed(), ['page:B P1:0']);
  await empty();
});

test('restoring a page from a deleted course brings back only its course and module', async () => {
  const { course, module, other, page, sibling, elsewhere } = await workspace('C');
  await deletePage(page.id);
  await deleteCourse(course.id);
  assert.equal(await getCourse(course.id), undefined);
  assert.equal(await getPage(elsewhere.id), undefined);
  assert.deepEqual(await listed(), ['course:C:2/2', 'page:C P1:0']);

  await restoreItems((await getDeletedItems()).filter(({ kind }) => kind === 'page'));
  assert.ok(await getCourse(course.id));
  assert.ok(await getModule(module.id));
  assert.equal((await getPage(page.id)).title, 'C P1');
  assert.equal(await getModule(other.id), undefined);
  assert.equal(await getPage(sibling.id), undefined);
  assert.deepEqual(await listed(), ['module:C M2:1', 'page:C P2:0']);

  await restoreItems(await getDeletedItems());
  assert.deepEqual((await getModules(course.id)).map(({ id }) => id), [module.id, other.id]);
  assert.deepEqual((await getPages(module.id)).map(({ id }) => id), [page.id, sibling.id]);
  await empty();
});

test('deleting permanently removes the rows and their files', async () => {
  const { course, page } = await workspace('D');
  await deleteCourse(course.id);
  deletedFiles.length = 0;
  await eraseItems(await getDeletedItems());
  assert.deepEqual(deletedFiles.sort(), ['D-cover', 'D-page-cover']);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM page WHERE id = ?').get(page.id).n, 0);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM module WHERE course_id = ?').get(course.id).n, 0);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM course WHERE id = ?').get(course.id).n, 0);
});

test('items are purged after 30 days, not before', async () => {
  const { page, sibling } = await workspace('E');
  await deletePage(page.id);
  await deletePage(sibling.id);
  const stamp = (days) => new Date(Date.now() - days * 86_400_000).toISOString().replace('T', ' ').slice(0, 23);
  database.prepare('UPDATE page SET deleted_at = ? WHERE id = ?').run(stamp(30.1), page.id);
  database.prepare('UPDATE page SET deleted_at = ? WHERE id = ?').run(stamp(29.9), sibling.id);
  const items = await getDeletedItems();
  assert.deepEqual(items.map((item) => [item.name, daysLeft(item)]).sort(), [['E P1', 0], ['E P2', 1]]);

  await purgeExpiredItems();
  assert.deepEqual(await listed(), ['page:E P2:0']);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM page WHERE id = ?').get(page.id).n, 0);
  await empty();
});

test('deleting a parent permanently takes its separately listed children with it', async () => {
  const { course, module, other, page } = await workspace('F');
  await deletePage(page.id);
  await deleteModule(other.id);
  await deleteCourse(course.id);
  assert.deepEqual(await listed(), ['course:F:1/1', 'module:F M2:1', 'page:F P1:0']);

  deletedFiles.length = 0;
  await eraseItems((await getDeletedItems()).filter(({ kind }) => kind === 'course'));
  assert.deepEqual(await listed(), []);
  assert.deepEqual(deletedFiles.sort(), ['F-cover', 'F-page-cover']);
  for (const [table, id] of [['page', page.id], ['module', module.id], ['module', other.id]]) {
    assert.equal(database.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE id = ?`).get(id).n, 0);
  }
});

test('the preview lists what is inside each deleted item', async () => {
  const { course, other, page } = await workspace('G');
  await deletePage(page.id);
  await deleteModule(other.id);
  await deleteCourse(course.id);
  const byKind = Object.fromEntries((await getDeletedItems()).map((item) => [item.kind, item]));
  const titles = async (item) => (await getDeletedPages(item)).map(({ module_name, title }) => `${module_name}/${title}`);
  assert.deepEqual(await titles(byKind.page), ['G M1/G P1']);
  assert.equal((await getDeletedPages(byKind.page))[0].content, 'needle');
  assert.deepEqual(await titles(byKind.module), ['G M2/G P3']);
  assert.deepEqual(await titles(byKind.course), ['G M1/G P2']);
  await empty();
});
