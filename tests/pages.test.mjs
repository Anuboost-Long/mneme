import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useTestDesktop } from './support/desktop.mjs';

const { database } = useTestDesktop();
const { initDb } = await import('../src/shared/lib/db/index.ts');
const { createCourse, deleteCourse } = await import('../src/features/courses/lib/courses.ts');
const { createModule, deleteModule } = await import('../src/features/courses/lib/modules.ts');
const { createPage, getPages, getPage, updatePage, deletePage, PageType } = await import('../src/features/courses/lib/pages.ts');
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

test('an embedded image survives a save/reload round-trip byte-for-byte, at a realistic size', async () => {
  const { id: moduleId } = await module();
  // Base64 alone can run several hundred KB for a real (post-resize)
  // photo/screenshot; a short string here wouldn't catch a truncation or
  // parameter-binding issue that only shows up at real size.
  const base64 = Buffer.alloc(400_000).fill('A').toString('base64');
  const html = `<h2>Figure 1-1</h2><p>Some text before.</p><img src="data:image/png;base64,${base64}" data-align="center"><p>Some text after.</p>`;
  const page = await createPage(moduleId, { title: 'Diagram page' });
  const saved = await updatePage(page.id, { content: html });
  assert.equal(saved.content, html);
  // Simulates a reload: forget everything in memory, re-fetch from
  // scratch — this is the actual "app memory" (SQLite) read path, the
  // same one PageEditor.tsx uses to populate the editor on mount.
  const reloaded = await getPage(page.id);
  assert.equal(reloaded.content, html);
  assert.ok(reloaded.content.includes(`data:image/png;base64,${base64}`), 'image data URL must survive intact, not truncated or mangled');
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
