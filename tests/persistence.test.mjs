import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { useTestDesktop } from './support/desktop.mjs';

const directory = mkdtempSync(join(tmpdir(), 'mneme-persistence-'));
const file = join(directory, 'mneme.db');
let { database } = useTestDesktop(file);
const { initDb } = await import('../src/shared/lib/db/index.ts');
const { createCourse, getCourses, updateCourse, deleteCourse } = await import('../src/features/courses/lib/courses.ts');
const { createModule, getModules, updateModule } = await import('../src/features/courses/lib/modules.ts');
const { getPage, getPages, createPage, updatePage, deletePage } = await import('../src/features/courses/lib/page/actions.ts');

test.after(() => {
  database.close();
  rmSync(directory, { recursive: true, force: true });
});

test('created, edited and deleted records read back the same after the app restarts', async () => {
  await initDb();
  const course = await createCourse({ name: 'Programming Fundamentals', code: 'CS101' });
  const removedCourse = await createCourse({ name: 'Dropped course' });
  const module = await createModule(course.id, { name: 'Module 1' });
  const page = await createPage(module.id, { title: 'Introduction', content: '<p>Welcome</p>' });
  const removedPage = await createPage(module.id, { title: 'Draft' });
  await updateCourse(course.id, { description: 'Loops and functions' });
  await updateModule(module.id, { name: 'Getting started' });
  await updatePage(page.id, { content: '<p>Welcome back</p>' });
  await deleteCourse(removedCourse.id);
  await deletePage(removedPage.id);
  const before = { courses: await getCourses(), modules: await getModules(course.id), page: await getPage(page.id) };

  database.close();
  ({ database } = useTestDesktop(file));
  await initDb();

  assert.deepEqual(await getCourses(), before.courses);
  assert.deepEqual(await getModules(course.id), before.modules);
  assert.deepEqual(await getPage(page.id), before.page);
  assert.deepEqual((await getCourses()).map(({ name, description }) => ({ name, description })), [
    { name: 'Programming Fundamentals', description: 'Loops and functions' },
  ]);
  assert.equal(before.modules[0].name, 'Getting started');
  assert.equal(before.page.content, '<p>Welcome back</p>');
  assert.deepEqual((await getPages(module.id)).map(({ id }) => id), [page.id]);
});
