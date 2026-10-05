import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

test('appearance is restored before rendering, with a safe default for missing or invalid preferences', () => {
  for (const [stored, expected] of [[null, 'light'], ['light', 'light'], ['dark', 'dark'], ['unknown', 'light']]) {
    const document = { documentElement: { dataset: {} } };
    runInNewContext(script, { document, localStorage: { getItem: (key) => (key === 'mneme.theme' ? stored : null) } });
    assert.equal(document.documentElement.dataset.theme, expected);
  }
});

test('saved appearance choices are restored before rendering, and a broken one leaves the theme alone', () => {
  const restored = { documentElement: { dataset: {} } };
  const saved = JSON.stringify({ accent: 'ocean', pageFont: 'serif', compact: true });
  runInNewContext(script, { document: restored, localStorage: { getItem: (key) => (key === 'mneme.theme' ? 'dark' : saved) } });
  assert.deepEqual({ ...restored.documentElement.dataset }, { theme: 'dark', accent: 'ocean', pageFont: 'serif', compact: 'true' });

  const broken = { documentElement: { dataset: {} } };
  runInNewContext(script, { document: broken, localStorage: { getItem: (key) => (key === 'mneme.theme' ? 'dark' : '{not json') } });
  assert.deepEqual({ ...broken.documentElement.dataset }, { theme: 'dark' });
});

test('blocked preference storage does not prevent startup', () => {
  const document = { documentElement: { dataset: {} } };
  runInNewContext(script, { document, localStorage: { getItem: () => { throw new Error('Blocked'); } } });
  assert.equal(document.documentElement.dataset.theme, 'light');
});
