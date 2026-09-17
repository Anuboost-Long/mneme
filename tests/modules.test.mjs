import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import ts from 'typescript';

const database = new DatabaseSync(':memory:');
globalThis.moduleTestStorage = {
  migrate: async (migrations) => {
    for (const migration of migrations) database.exec(migration.sql);
  },
  query: async (sql, params = []) => database.prepare(sql).all(...params),
  execute: async (sql, params = []) => {
    const result = database.prepare(sql).run(...params);
    return { rowsAffected: Number(result.changes), lastInsertId: Number(result.lastInsertRowid) };
  },
};

// Each lib file under test is transpiled and imported standalone from a
// `data:` URL, so its own relative imports (no base path to resolve
// against) are resolved here by recursively doing the same to whichever
// of these known dependencies it references.
const knownDeps = {
  'from "./migrations"': '../src/shared/lib/db/migrations/index.ts',
  'from "./0001-initial"': '../src/shared/lib/db/migrations/0001-initial.ts',
  'from "./0002-completion-tracking"': '../src/shared/lib/db/migrations/0002-completion-tracking.ts',
  'from "./0003-numeric-enums"': '../src/shared/lib/db/migrations/0003-numeric-enums.ts',
  'from "./completion-status"': '../src/features/courses/lib/completion-status.ts',
};

async function moduleUrl(path, replace) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  if (replace) source = source.replace(replace[0], replace[1]);
  let { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  for (const [marker, depPath] of Object.entries(knownDeps)) {
    if (outputText.includes(marker)) outputText = outputText.replace(marker, `from "${await moduleUrl(depPath)}"`);
  }
  return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
}

async function load(path, replace) {
  return import(await moduleUrl(path, replace));
}

const { initDb } = await load(
  '../src/shared/lib/db/index.ts',
  ['import { desktop } from "@chain/sdk";', 'const desktop = { storage: globalThis.moduleTestStorage };'],
);
const { createCourse } = await load(
  '../src/features/courses/lib/courses.ts',
  ['import { desktop } from "@chain/sdk";', 'const desktop = { storage: globalThis.moduleTestStorage };'],
);
const { createModule, getModules, getModule, updateModule, deleteModule, ModuleStatus } = await load(
  '../src/features/courses/lib/modules.ts',
  ['import { desktop } from "@chain/sdk";', 'const desktop = { storage: globalThis.moduleTestStorage };'],
);
await initDb();

async function course() {
  return createCourse({ name: 'Programming Fundamentals' });
}

test('module lifecycle uses SQLite IDs, stable creation order, partial edits and default status', async () => {
  const { id: courseId } = await course();
  await assert.rejects(createModule(courseId, { name: '  ' }), /module name/);
  const first = await createModule(courseId, { name: '  Module 1  ', description: ' Introduction ' });
  const second = await createModule(courseId, { name: 'Module 2', status: ModuleStatus.InProgress });
  assert.equal(first.name, 'Module 1');
  assert.equal(first.description, 'Introduction');
  assert.equal(first.status, ModuleStatus.NotStarted);
  assert.equal(second.status, ModuleStatus.InProgress);
  assert.deepEqual((await getModules(courseId)).map((module) => module.id), [first.id, second.id]);
  database.prepare("UPDATE module SET updated_at = '2000-01-01' WHERE id = ?").run(first.id);
  const edited = await updateModule(first.id, { name: 'Introduction to programming', status: ModuleStatus.Completed });
  assert.equal(edited.description, 'Introduction');
  assert.equal(edited.status, ModuleStatus.Completed);
  assert.notEqual(edited.updated_at, '2000-01-01');
  await assert.rejects(updateModule(first.id, { name: ' ' }), /module name/);
  await updateModule(first.id, { description: '' });
  assert.equal((await getModule(first.id)).description, null);
  await deleteModule(first.id);
  assert.equal(await getModule(first.id), undefined);
  assert.equal((await getModules(courseId)).length, 1);
  await assert.rejects(updateModule(first.id, { name: 'Missing' }), /no longer exists/);
  await deleteModule(second.id);
});

test('modules only list under their own course', async () => {
  const courseA = await course();
  const courseB = await createCourse({ name: 'Linear Algebra' });
  const moduleA = await createModule(courseA.id, { name: 'Loops' });
  const moduleB = await createModule(courseB.id, { name: 'Vectors' });
  assert.deepEqual((await getModules(courseA.id)).map((module) => module.id), [moduleA.id]);
  assert.deepEqual((await getModules(courseB.id)).map((module) => module.id), [moduleB.id]);
  await deleteModule(moduleA.id);
  await deleteModule(moduleB.id);
});

test('deleting a course deletes its modules', async () => {
  const { deleteCourse } = await load(
    '../src/features/courses/lib/courses.ts',
    ['import { desktop } from "@chain/sdk";', 'const desktop = { storage: globalThis.moduleTestStorage };'],
  );
  const { id: courseId } = await course();
  const module = await createModule(courseId, { name: 'Revision' });
  await deleteCourse(courseId);
  assert.equal(await getModule(module.id), undefined);
});

test('a new module defaults to 0% progress and unbookmarked, and both are filterable', async () => {
  const { id: courseId } = await course();
  const plain = await createModule(courseId, { name: 'Loops' });
  assert.equal(plain.progress, 0);
  assert.equal(plain.bookmarked, false);

  const starred = await createModule(courseId, { name: 'Recursion', progress: 250, bookmarked: true });
  assert.equal(starred.progress, 100, 'progress is clamped to 100');
  assert.equal(starred.bookmarked, true);

  assert.deepEqual((await getModules(courseId, { bookmarked: true })).map((m) => m.id), [starred.id]);

  await deleteModule(plain.id);
  await deleteModule(starred.id);
});
