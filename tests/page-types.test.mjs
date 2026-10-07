import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useTestDesktop } from './support/desktop.mjs';

const desktop = useTestDesktop();
const { initDb } = await import('../src/shared/lib/db/index.ts');
const { createCourse } = await import('../src/features/courses/lib/course/actions.ts');
const { createModule } = await import('../src/features/courses/lib/module/actions.ts');
const { createPage, getPage } = await import('../src/features/courses/lib/page/actions.ts');
const { createCustomPageType, deleteCustomPageType, renameCustomPageType } = await import('../src/features/courses/lib/page-type/actions.ts');
const { loadCustomPageTypes, pageTypeLabel, pageTypeOptions } = await import('../src/features/courses/lib/page-type/pageTypesState.ts');
const { customTypeValue } = await import('../src/features/courses/lib/page-type/types.ts');
const { createBackup, restoreBackup } = await import('../src/features/courses/lib/backup/actions.ts');
await initDb();

test('custom page types are named sensibly, listed after the built-in ones, and their pages become Custom when deleted', async () => {
  await assert.rejects(createCustomPageType('  '), /Enter a name/);
  await assert.rejects(createCustomPageType('lecture'), /already a built-in page type/);
  const lab = await createCustomPageType(' Lab report ');
  await assert.rejects(createCustomPageType('LAB REPORT'), /already have a page type called/);
  const study = await createCustomPageType('Case study');
  await renameCustomPageType(study.id, 'Case studies');
  await loadCustomPageTypes();

  assert.equal(pageTypeLabel(customTypeValue(lab.id)), 'Lab report');
  assert.equal(pageTypeLabel(2), 'Lecture');
  assert.equal(pageTypeLabel(999), 'Custom');
  assert.deepEqual(pageTypeOptions().slice(-2), [
    { value: customTypeValue(lab.id), label: 'Lab report' },
    { value: customTypeValue(study.id), label: 'Case studies' }
  ]);

  const course = await createCourse({ name: 'Chemistry' });
  const module = await createModule(course.id, { name: 'Week 1' });
  const page = await createPage(module.id, { title: 'Titration', type: customTypeValue(study.id) });
  await deleteCustomPageType(study.id);
  await loadCustomPageTypes();
  assert.equal((await getPage(page.id)).type, 9);
  assert.equal(pageTypeOptions().length, 10);
});

test('custom page types travel with a backup', async () => {
  const backup = await createBackup();
  assert.deepEqual(backup.pageTypes.map(({ name }) => name), ['Lab report']);
  desktop.database.exec('DELETE FROM custom_page_type');
  await restoreBackup(backup);
  await loadCustomPageTypes();
  assert.equal(pageTypeLabel(customTypeValue(backup.pageTypes[0].id)), 'Lab report');
});
