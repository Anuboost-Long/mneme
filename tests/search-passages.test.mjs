import assert from 'node:assert/strict';
import { test } from 'node:test';
import './support/desktop.mjs';

const { splitIntoPassages } = await import('../src/features/search/lib/passages.ts');

test('a page becomes its title, then passages under their headings, each carrying its context', () => {
  const long = 'Attackers want money. '.repeat(50).trim();
  assert.deepEqual(
    splitIntoPassages('Cyber threats', `<p>Intro text.</p><h2>Motives</h2><ul><li><p>Ransom</p></li><li>Theft</li></ul><p>${long}</p><h3>Means</h3><p>Tools.</p>`),
    [
      'Cyber threats',
      'Cyber threats: Intro text.',
      'Cyber threats — Motives: Ransom Theft',
      `Cyber threats — Motives: ${long}`,
      'Cyber threats — Means: Tools.'
    ]
  );
  assert.deepEqual(splitIntoPassages('Empty page', null), ['Empty page']);
});
