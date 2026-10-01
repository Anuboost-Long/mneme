import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useTestDesktop } from './support/desktop.mjs';

useTestDesktop();
const { initDb } = await import('../src/shared/lib/db/index.ts');
const { createCourse } = await import('../src/features/courses/lib/courses.ts');
const { createModule } = await import('../src/features/courses/lib/modules.ts');
const { createPage, getPage, updatePage } = await import('../src/features/courses/lib/pages.ts');
const { getModuleHighlights } = await import('../src/features/courses/lib/highlights.ts');
await initDb();

async function module() {
  const course = await createCourse({ name: 'Biology' });
  return createModule(course.id, { name: 'Cells' });
}

const mark = (ref, html) => `<mark data-highlight-ref="${ref}">${html}</mark>`;

test('saving a page records one highlight per ref, in page order', async () => {
  const { id: moduleId } = await module();
  await createPage(moduleId, {
    title: 'Membranes',
    content: `<p>${mark('b', 'Lipid <strong>bilayer</strong>')} and ${mark('a', 'proteins')}</p><p>${mark('empty', ' ')}</p>`
  });
  const highlights = await getModuleHighlights(moduleId);
  assert.deepEqual(
    highlights.map(({ ref, html, position, orphaned_at }) => ({ ref, html, position, orphaned_at })),
    [
      { ref: 'b', html: '<p>Lipid <strong>bilayer</strong></p>', position: 0, orphaned_at: null },
      { ref: 'a', html: '<p>proteins</p>', position: 1, orphaned_at: null }
    ]
  );
});

test('a highlight spanning several blocks stays one row, keeping list numbers', async () => {
  const { id: moduleId } = await module();
  await createPage(moduleId, {
    title: 'Mitosis',
    content: `<p>${mark('x', 'Phases:')}</p><ol start="2"><li><p>Prophase</p></li><li><p>${mark('x', 'Metaphase')}</p></li></ol><ul data-type="taskList"><li><p>${mark('t', 'Revise')}</p></li></ul>`
  });
  const [spanning, task] = await getModuleHighlights(moduleId);
  assert.equal(spanning.html, '<p>Phases:</p><ol><li value="3"><p>Metaphase</p></li></ol>');
  assert.equal(task.html, '<p>Revise</p>');
});

test('a highlight whose text is edited away is orphaned, and restored when its mark returns', async () => {
  const { id: moduleId } = await module();
  const page = await createPage(moduleId, { title: 'Organelles', content: `<p>${mark('m', 'Mitochondria')}</p>` });
  await updatePage(page.id, { content: '<p>Ribosomes</p>' });
  const [orphaned] = await getModuleHighlights(moduleId);
  assert.notEqual(orphaned.orphaned_at, null);
  await updatePage(page.id, { content: `<p>${mark('m', 'Mitochondria')}</p>` });
  const [restored] = await getModuleHighlights(moduleId);
  assert.equal(restored.id, orphaned.id);
  assert.equal(restored.orphaned_at, null);
});

test('a save that drops a mark but keeps its text puts the mark back', async () => {
  const { id: moduleId } = await module();
  const page = await createPage(moduleId, { title: 'Nucleus', content: `<p>The ${mark('n', 'nucleus')} holds DNA.</p>` });
  await updatePage(page.id, { content: '<p>The nucleus holds DNA. It has a membrane.</p>' });
  assert.equal((await getPage(page.id)).content, `<p>The ${mark('n', 'nucleus')} holds DNA. It has a membrane.</p>`);
  const [highlight] = await getModuleHighlights(moduleId);
  assert.equal(highlight.orphaned_at, null);
});

test('a dropped mark whose text now appears twice is orphaned rather than guessed', async () => {
  const { id: moduleId } = await module();
  const page = await createPage(moduleId, { title: 'Cell wall', content: `<p>${mark('w', 'cellulose')}</p>` });
  await updatePage(page.id, { content: '<p>cellulose and more cellulose</p>' });
  assert.equal((await getPage(page.id)).content, '<p>cellulose and more cellulose</p>');
  const [highlight] = await getModuleHighlights(moduleId);
  assert.notEqual(highlight.orphaned_at, null);
});
