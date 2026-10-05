import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useTestDesktop } from './support/desktop.mjs';

useTestDesktop();
const VOCABULARY = ['money', 'ransom', 'motive', 'revenge', 'malware', 'phishing', 'firewall', 'network', 'attacker', 'why'];
const embedded = [];
function bagOfWords(text) {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const vector = new Float32Array(VOCABULARY.length);
  for (const word of words) {
    const index = VOCABULARY.findIndex((known) => word.startsWith(known));
    if (index !== -1) vector[index] += 1;
  }
  const length = Math.hypot(...vector) || 1;
  return vector.map((value) => value / length);
}
globalThis.chainDesktop.models = {
  list: async () => [
    { id: 'bge-small-en-v1-5', sizeBytes: 1 },
    { id: 'bge-small-en-v1-5-tokenizer', sizeBytes: 1 }
  ]
};
globalThis.chainDesktop.embeddings = {
  embed: async (texts, options) => {
    if (options.as === 'passage') embedded.push(...texts);
    return { dimension: VOCABULARY.length, maxTokens: 512, vectors: texts.map(bagOfWords), texts: texts.map(() => ({ tokens: 1, truncated: false })) };
  },
  unload: async () => undefined
};

const { initDb } = await import('../src/shared/lib/db/index.ts');
const { createCourse } = await import('../src/features/courses/lib/course/actions.ts');
const { createModule } = await import('../src/features/courses/lib/module/actions.ts');
const { createPage, deletePage, updatePage } = await import('../src/features/courses/lib/page/actions.ts');
const { searchByMeaning, updateSearchIndex } = await import('../src/features/search/lib/searchIndex.ts');
await initDb();

test('pages are indexed on the device, ranked by meaning, re-indexed when edited, and deleted pages drop out', async () => {
  const course = await createCourse({ name: 'Security' });
  const module = await createModule(course.id, { name: 'Week 4' });
  const motives = await createPage(module.id, { title: 'Chapter 5', content: '<h2>Motives</h2><p>Money and ransom drive most attackers; revenge drives some.</p>' });
  const networks = await createPage(module.id, { title: 'Chapter 7', content: '<h2>Defences</h2><p>A firewall protects the network.</p>' });

  await updateSearchIndex();
  const [first] = await searchByMeaning('why do attackers want money', 5);
  assert.equal(first.page_id, motives.id);
  assert.match(first.text, /Motives: Money and ransom/);

  embedded.length = 0;
  await updateSearchIndex();
  assert.deepEqual(embedded, []);

  await new Promise((resolve) => setTimeout(resolve, 1100));
  await updatePage(networks.id, { content: '<h2>Defences</h2><p>A firewall protects the network.</p><p>Phishing and malware get past it.</p>' });
  await updateSearchIndex();
  assert.deepEqual(embedded, ['Chapter 7 — Defences: A firewall protects the network. Phishing and malware get past it.']);
  assert.equal((await searchByMeaning('phishing malware', 5))[0].page_id, networks.id);

  await deletePage(motives.id);
  assert.ok(!(await searchByMeaning('ransom money motive', 5)).some((match) => match.page_id === motives.id));
});
