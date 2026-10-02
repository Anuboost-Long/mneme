import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useTestDesktop } from './support/desktop.mjs';

useTestDesktop();
const { initDb } = await import('../src/shared/lib/db/index.ts');
const { deleteLayout, getLayouts, saveLayout } = await import('../src/features/home/lib/layout/actions.ts');
await initDb();

const home = [
  { kind: 'note', size: 'large', config: { title: 'This week', text: 'Read chapter 4' } },
  { kind: 'streak', size: 'small', config: {} }
];

test('a saved layout keeps every widget with its size and settings', async () => {
  const saved = await saveLayout('  Exam week  ', home);
  assert.equal(saved.name, 'Exam week');
  const [loaded] = await getLayouts();
  assert.deepEqual(loaded.widgets, home);
  await deleteLayout(saved.id);
  assert.deepEqual(await getLayouts(), []);
});

test('a layout needs a name, at least one widget, and a name not already used in any case', async () => {
  await assert.rejects(saveLayout('   ', home), /Enter a name/);
  await assert.rejects(saveLayout('Empty', []), /Add a widget/);
  const first = await saveLayout('Focus mode', home);
  await assert.rejects(saveLayout('focus MODE', home), /already have a layout named “focus MODE”/);
  await deleteLayout(first.id);
});

test('layouts list by name, ignoring case', async () => {
  const zeta = await saveLayout('zeta', home);
  const alpha = await saveLayout('Alpha', home);
  assert.deepEqual((await getLayouts()).map((layout) => layout.name), ['Alpha', 'zeta']);
  await deleteLayout(zeta.id);
  await deleteLayout(alpha.id);
});
