import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useTestDesktop } from './support/desktop.mjs';

useTestDesktop();
const { initDb } = await import('../src/shared/lib/db/index.ts');
const { tools } = await import('../src/features/agent-server/lib/tools.ts');
const { createCourse, eraseCourse } = await import('../src/features/courses/lib/course/actions.ts');
const { createModule, deleteModule } = await import('../src/features/courses/lib/module/actions.ts');
const { createPage, getPage, getPages, updatePage } = await import('../src/features/courses/lib/page/actions.ts');
const { createRecording, saveTranscript } = await import('../src/features/courses/lib/recording/actions.ts');
await initDb();

const call = (name, args) => tools.find((tool) => tool.name === name).execute(args);
const describe = (name, args) => tools.find((tool) => tool.name === name).describeCall(args);

async function library() {
  const course = await createCourse({ name: 'Chemistry' });
  const first = await createModule(course.id, { name: 'Atoms' });
  const second = await createModule(course.id, { name: 'Bonds' });
  return { course, first, second };
}

test('create_page refuses a module that does not exist or was deleted', async () => {
  const { course, first, second } = await library();
  await assert.rejects(call('create_page', { module_id: 99999, title: 'Lost' }), /No module with id 99999. Call list_modules/);
  await deleteModule(second.id);
  await assert.rejects(call('create_page', { module_id: second.id, title: 'Lost' }), /No module with id/);
  const page = await call('create_page', { module_id: first.id, title: 'Electrons' });
  assert.equal(page.module_id, first.id);
  await eraseCourse(course.id);
});

test('insert_blocks adds content at the end, the start, or after a block, leaving highlights alone', async () => {
  const { course, first } = await library();
  const page = await createPage(first.id, {
    title: 'Electrons',
    content: '<h2>Shells</h2><p>Electrons sit in <mark data-highlight-ref="r1">shells</mark>.</p><h2>Orbitals</h2><p>Shapes.</p>'
  });
  await call('insert_blocks', { id: page.id, html: '<p>Summary at the end.</p>' });
  await call('insert_blocks', { id: page.id, html: '<p>Intro.</p>', position: 'start' });
  await call('insert_blocks', { id: page.id, html: '<p>After shells.</p>', after_text: 'sit in SHELLS' });
  assert.equal(
    (await getPage(page.id)).content,
    '<p>Intro.</p><h2>Shells</h2><p>Electrons sit in <mark data-highlight-ref="r1">shells</mark>.</p><p>After shells.</p><h2>Orbitals</h2><p>Shapes.</p><p>Summary at the end.</p>'
  );
  await assert.rejects(call('insert_blocks', { id: page.id, html: '<p>x</p>', after_text: 'nowhere' }), /No block on this page contains “nowhere”/);
  await assert.rejects(call('insert_blocks', { id: page.id, html: '<p> </p>' }), /nothing to insert/);
  await assert.rejects(call('insert_blocks', { id: 99999, html: '<p>x</p>' }), /No page with id 99999/);
  assert.equal(describe('insert_blocks', { id: page.id, html: 'x', after_text: 'Shells' }), `Add content to page #${page.id} after “Shells”.`);
  await eraseCourse(course.id);
});

test('move_page moves a page to the end of another module and checks both ends', async () => {
  const { course, first, second } = await library();
  const page = await createPage(first.id, { title: 'Ionic bonds' });
  await createPage(second.id, { title: 'Covalent bonds' });
  const moved = await call('move_page', { id: page.id, module_id: second.id });
  assert.equal(moved.module_id, second.id);
  assert.equal(moved.content, undefined);
  assert.deepEqual((await getPages(second.id)).map((item) => item.title), ['Covalent bonds', 'Ionic bonds']);
  await assert.rejects(call('move_page', { id: page.id, module_id: 99999 }), /No module with id 99999/);
  await assert.rejects(call('move_page', { id: 99999, module_id: first.id }), /No page with id 99999/);
  await eraseCourse(course.id);
});

test('read_transcript returns a page’s recordings, or one recording, with null for untranscribed ones', async () => {
  const { course, first } = await library();
  const page = await createPage(first.id, { title: 'Lecture' });
  const transcribed = await createRecording(page.id, new Blob([Buffer.from('a')], { type: 'audio/mp4' }), 60000);
  await createRecording(page.id, new Blob([Buffer.from('b')], { type: 'audio/mp4' }), 30000);
  await saveTranscript(transcribed.id, { segments: [{ startMs: 0, endMs: 1000, text: ' Atoms are mostly empty space. ' }] });
  const onPage = await call('read_transcript', { page_id: page.id });
  assert.deepEqual(onPage.map((item) => item.transcript), ['Atoms are mostly empty space.', null]);
  assert.equal((await call('read_transcript', { recording_id: transcribed.id })).duration_ms, 60000);
  await assert.rejects(call('read_transcript', {}), /Pass "page_id" or "recording_id"/);
  await eraseCourse(course.id);
});

test('create_summary files a Notes page right after its page, or at the end of a module', async () => {
  const { PageType } = await import('../src/features/courses/lib/page/types.ts');
  const { course, first } = await library();
  const source = await createPage(first.id, { title: 'Isotopes' });
  await createPage(first.id, { title: 'Ions' });
  const summary = await call('create_summary', { page_id: source.id, content: '<ul><li>Same element, different neutrons.</li></ul>' });
  assert.equal(summary.title, 'Summary: Isotopes');
  assert.equal(summary.type, PageType.Notes);
  assert.deepEqual((await getPages(first.id)).map((item) => item.title), ['Isotopes', 'Summary: Isotopes', 'Ions']);
  const moduleSummary = await call('create_summary', { module_id: first.id, content: '<p>All of it.</p>', title: 'Atoms recap' });
  assert.equal(moduleSummary.title, 'Atoms recap');
  assert.equal((await getPages(first.id)).at(-1).title, 'Atoms recap');
  await assert.rejects(call('create_summary', { content: '<p>x</p>' }), /Pass "page_id" or "module_id"/);
  await eraseCourse(course.id);
});

test('duplicating a page still lands the copy right after the original', async () => {
  const { duplicatePage } = await import('../src/features/courses/lib/page/actions.ts');
  const { course, first } = await library();
  const original = await createPage(first.id, { title: 'Moles' });
  await createPage(first.id, { title: 'Molarity' });
  await updatePage(original.id, { content: '<p>6.022e23</p>' });
  const copy = await duplicatePage(original.id);
  assert.equal(copy.content, '<p>6.022e23</p>');
  assert.deepEqual((await getPages(first.id)).map((item) => item.title), ['Moles', 'Moles (copy)', 'Molarity']);
  await eraseCourse(course.id);
});

test('a change that cannot work is refused before the user is asked to approve it', { timeout: 5000 }, async () => {
  const { handleMcpRequest } = await import('../src/features/agent-server/lib/mcp.ts');
  const response = await handleMcpRequest({
    method: 'POST',
    path: '/mcp',
    headers: {},
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'move_page', arguments: { id: 99999, module_id: 1 } } })
  });
  const { result } = JSON.parse(response.body);
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /No page with id 99999/);
});
