import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useTestDesktop } from './support/desktop.mjs';

const { database, writtenFiles } = useTestDesktop();
const { initDb } = await import('../src/shared/lib/db/index.ts');
const { createCourse, deleteCourse } = await import('../src/features/courses/lib/courses.ts');
const { createModule, deleteModule } = await import('../src/features/courses/lib/modules.ts');
const { PageType } = await import('../src/features/courses/lib/page/types.ts');
const { getPages, getPage } = await import('../src/features/courses/lib/page/table.ts');
const { createPage, updatePage, deletePage, storeInlinePageImages } = await import('../src/features/courses/lib/page/actions.ts');
await initDb();

async function module() {
  const course = await createCourse({ name: 'Programming Fundamentals' });
  return createModule(course.id, { name: 'Module 1' });
}

test('page lifecycle uses SQLite IDs, stable creation order, partial edits and default type', async () => {
  const { id: moduleId } = await module();
  await assert.rejects(createPage(moduleId, { title: '  ' }), /page title/);
  const first = await createPage(moduleId, { title: '  Introduction  ', content: ' Welcome ' });
  const second = await createPage(moduleId, { title: 'Exercise 1', type: PageType.Exercise });
  assert.equal(first.title, 'Introduction');
  assert.equal(first.content, 'Welcome');
  assert.equal(first.type, PageType.Lesson);
  assert.equal(second.type, PageType.Exercise);
  assert.deepEqual((await getPages(moduleId)).map((page) => page.id), [first.id, second.id]);
  database.prepare("UPDATE page SET updated_at = '2000-01-01' WHERE id = ?").run(first.id);
  const edited = await updatePage(first.id, { title: 'Intro', type: PageType.Reading });
  assert.equal(edited.content, 'Welcome');
  assert.equal(edited.type, PageType.Reading);
  assert.notEqual(edited.updated_at, '2000-01-01');
  await assert.rejects(updatePage(first.id, { title: ' ' }), /page title/);
  await updatePage(first.id, { content: '' });
  assert.equal((await getPage(first.id)).content, null);
  await deletePage(first.id);
  assert.equal(await getPage(first.id), undefined);
  assert.equal((await getPages(moduleId)).length, 1);
  await assert.rejects(updatePage(first.id, { title: 'Missing' }), /no longer exists/);
  await deletePage(second.id);
});

test('pages only list under their own module', async () => {
  const moduleA = await module();
  const course = await createCourse({ name: 'Linear Algebra' });
  const moduleB = await createModule(course.id, { name: 'Vectors' });
  const pageA = await createPage(moduleA.id, { title: 'Loops' });
  const pageB = await createPage(moduleB.id, { title: 'Dot product' });
  assert.deepEqual((await getPages(moduleA.id)).map((page) => page.id), [pageA.id]);
  assert.deepEqual((await getPages(moduleB.id)).map((page) => page.id), [pageB.id]);
  await deletePage(pageA.id);
  await deletePage(pageB.id);
});

test('deleting a module deletes its pages', async () => {
  const { id: moduleId } = await module();
  const page = await createPage(moduleId, { title: 'Revision' });
  await deleteModule(moduleId);
  assert.equal(await getPage(page.id), undefined);
});

test('deleting a course deletes pages under all of its modules', async () => {
  const course = await createCourse({ name: 'Data Structures' });
  const moduleA = await createModule(course.id, { name: 'Arrays' });
  const moduleB = await createModule(course.id, { name: 'Trees' });
  const pageA = await createPage(moduleA.id, { title: 'Intro to arrays' });
  const pageB = await createPage(moduleB.id, { title: 'Binary trees' });
  await deleteCourse(course.id);
  assert.equal(await getPage(pageA.id), undefined);
  assert.equal(await getPage(pageB.id), undefined);
});

test('an inline image is saved as a file and the page keeps only its URL', async () => {
  const { id: moduleId } = await module();
  const bytes = Buffer.alloc(300_000, 7);
  const html = `<p>Before.</p><img src="data:image/png;base64,${bytes.toString('base64')}" data-align="center"><p>After.</p>`;
  const page = await createPage(moduleId, { title: 'Diagram page' });
  const saved = await updatePage(page.id, { content: html });
  const [reference] = [...writtenFiles].find(([, written]) => Buffer.from(written).equals(bytes));
  assert.equal(saved.content, `<p>Before.</p><img src="asset://localhost/${reference}" data-align="center"><p>After.</p>`);
  assert.equal((await getPage(page.id)).content, saved.content);
  const filesBefore = writtenFiles.size;
  await updatePage(page.id, { content: html.replace('After.', 'After, edited.') });
  assert.equal(writtenFiles.size, filesBefore, 'saving the same inline image again reuses its file');
  await deletePage(page.id);
});

test('an inline image of a type the app does not store stays inline', async () => {
  const { id: moduleId } = await module();
  const html = '<img src="data:image/bmp;base64,Qk0=">';
  const page = await createPage(moduleId, { title: 'Bitmap', content: html });
  assert.equal(page.content, html);
  await deletePage(page.id);
});

test('pages saved with inline images are moved to files once', async () => {
  const { id: moduleId } = await module();
  const page = await createPage(moduleId, { title: 'Old page' });
  const base64 = Buffer.from('old picture').toString('base64');
  database.prepare('UPDATE page SET content = ? WHERE id = ?').run(`<img src="data:image/jpeg;base64,${base64}">`, page.id);
  await storeInlinePageImages();
  assert.match((await getPage(page.id)).content, /^<img src="asset:\/\/localhost\/[0-9a-f]{16}\.jpg">$/);
  await deletePage(page.id);
});

test('a new page defaults to not-started, 0% progress and unbookmarked, and each is filterable', async () => {
  const { CompletionStatus } = await import('../src/features/courses/lib/completion-status.ts');
  const { id: moduleId } = await module();
  const plain = await createPage(moduleId, { title: 'Loops' });
  assert.equal(plain.status, CompletionStatus.NotStarted);
  assert.equal(plain.progress, 0);
  assert.equal(plain.bookmarked, false);

  const starred = await createPage(moduleId, { title: 'Recursion', status: CompletionStatus.Completed, progress: 90, bookmarked: true });
  assert.equal(starred.status, CompletionStatus.Completed);
  assert.equal(starred.bookmarked, true);

  assert.deepEqual((await getPages(moduleId, { bookmarked: true })).map((p) => p.id), [starred.id]);
  assert.deepEqual((await getPages(moduleId, { status: CompletionStatus.Completed })).map((p) => p.id), [starred.id]);
  assert.deepEqual((await getPages(moduleId, { type: PageType.Lesson })).map((p) => p.id).sort(), [plain.id, starred.id].sort());

  await deletePage(plain.id);
  await deletePage(starred.id);
});

test('a new page counts as opened when it was made, however it was inserted', async () => {
  const { id: moduleId } = await module();
  const created = await createPage(moduleId, { title: 'Fresh' });
  assert.equal(created.opened_at, created.updated_at);
  database.prepare("INSERT INTO page (module_id, title, updated_at) VALUES (?, 'Restored', '2025-05-05 10:00:00')").run(moduleId);
  const restored = database.prepare("SELECT opened_at FROM page WHERE title = 'Restored'").get();
  assert.equal(restored.opened_at, '2025-05-05 10:00:00');
  await deletePage(created.id);
});
