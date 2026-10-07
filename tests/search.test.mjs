import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useTestDesktop } from './support/desktop.mjs';

useTestDesktop();
const { initDb } = await import('../src/shared/lib/db/index.ts');
const { createCourse } = await import('../src/features/courses/lib/course/actions.ts');
const { createModule } = await import('../src/features/courses/lib/module/actions.ts');
const { createPage, deletePage } = await import('../src/features/courses/lib/page/actions.ts');
const { createAttachment, searchAttachmentLinks } = await import('../src/features/courses/lib/attachment/actions.ts');
await initDb();

test('attachments are found by file name with the page they are on, and not on deleted pages', async () => {
  const course = await createCourse({ name: 'Security' });
  const module = await createModule(course.id, { name: 'Week 4' });
  const kept = await createPage(module.id, { title: 'Threats' });
  const gone = await createPage(module.id, { title: 'Old notes' });
  await createAttachment(kept.id, new File([new Uint8Array([1])], 'Kill chain_100%.pdf', { type: 'application/pdf' }));
  await createAttachment(gone.id, new File([new Uint8Array([1])], 'Kill chain draft.pdf', { type: 'application/pdf' }));
  await deletePage(gone.id);

  assert.deepEqual(
    (await searchAttachmentLinks('kill chain', 6)).map(({ file_name, page_title, page_id, module_id, course_id }) => [file_name, page_title, page_id, module_id, course_id]),
    [['Kill chain_100%.pdf', 'Threats', kept.id, module.id, course.id]]
  );
  assert.equal((await searchAttachmentLinks('100%', 6)).length, 1);
  assert.equal((await searchAttachmentLinks('k_ll', 6)).length, 0);
});
