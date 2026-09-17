import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

test('appearance is restored before rendering, with a safe default for missing or invalid preferences', () => {
  for (const [stored, expected] of [[null, 'light'], ['light', 'light'], ['dark', 'dark'], ['unknown', 'light']]) {
    const document = { documentElement: { dataset: {} } };
    runInNewContext(script, { document, localStorage: { getItem: (key) => { assert.equal(key, 'mneme.theme'); return stored; } } });
    assert.equal(document.documentElement.dataset.theme, expected);
  }
});

test('blocked preference storage does not prevent startup', () => {
  const document = { documentElement: { dataset: {} } };
  runInNewContext(script, { document, localStorage: { getItem: () => { throw new Error('Blocked'); } } });
  assert.equal(document.documentElement.dataset.theme, 'light');
});
