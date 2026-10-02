import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';

const src = new URL('../src/', import.meta.url);
const files = (await readdir(src, { recursive: true })).filter((path) => /\.tsx?$/.test(path));

test('only shared/lib/api.ts calls desktop.http', async () => {
  const callers = [];
  for (const path of files) {
    const source = await readFile(new URL(path, src), 'utf8');
    if (/desktop\s*(\.|\?\.)\s*http\b|desktop\s*\[\s*["']http["']\s*\]|\{[^}]*\bhttp\b[^}]*\}\s*=\s*desktop\b/.test(source)) callers.push(path);
  }
  assert.deepEqual(callers, ['shared/lib/api.ts']);
});

test("a data folder's table is imported only from inside that folder", async () => {
  const outsiders = [];
  for (const path of files) {
    const source = await readFile(new URL(path, src), 'utf8');
    for (const [, specifier] of source.matchAll(/from\s+["']([^"']*\/([\w-]+)\/table(?:\/[\w-]+)?)["']/g)) {
      const folder = new URL(specifier.replace(/\/table(\/[\w-]+)?$/, '/'), new URL(path, src)).href;
      if (!new URL(path, src).href.startsWith(folder)) outsiders.push(`${path} -> ${specifier}`);
    }
  }
  assert.deepEqual(outsiders, []);
});
