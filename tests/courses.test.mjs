import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import ts from 'typescript';

const database = new DatabaseSync(':memory:');
const calls = [];
globalThis.courseTestStorage = {
  migrate: async (migrations) => {
    for (const migration of migrations) database.exec(migration.sql);
  },
  query: async (sql, params = []) => database.prepare(sql).all(...params),
  execute: async (sql, params = []) => {
    calls.push({ sql, params });
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
  ['import { desktop } from "@chain/sdk";', 'const desktop = { storage: globalThis.courseTestStorage };'],
);
const { createCourse, getCourses, getCourse, updateCourse, deleteCourse } = await load(
  '../src/features/courses/lib/courses.ts',
  ['import { desktop } from "@chain/sdk";', 'const desktop = { storage: globalThis.courseTestStorage };'],
);
await initDb();

test('course lifecycle uses SQLite IDs, stable creation order, partial edits and bound values', async () => {
  await assert.rejects(createCourse({ name: '  ' }), /course name/);
  const first = await createCourse({ name: '  Biology  ', description: ' Cells ', icon: 'science', color: '#52745b' });
  const second = await createCourse({ name: "Literature'); DROP TABLE course; --" });
  assert.equal(first.name, 'Biology');
  assert.equal(first.description, 'Cells');
  assert.equal(second.description, null);
  assert.deepEqual((await getCourses()).map(course => course.id), [first.id, second.id]);
  database.prepare("UPDATE course SET updated_at = '2000-01-01' WHERE id = ?").run(first.id);
  const edited = await updateCourse(first.id, { name: 'Cell biology', description: '' });
  assert.equal(edited.description, null);
  assert.equal(edited.icon, 'science');
  assert.equal(edited.color, '#52745b');
  assert.notEqual(edited.updated_at, '2000-01-01');
  assert.deepEqual((await getCourses()).map(course => course.id), [first.id, second.id]);
  await assert.rejects(updateCourse(first.id, { name: ' ' }), /course name/);
  assert.equal((await getCourse(first.id)).name, 'Cell biology');
  await updateCourse(first.id, { icon: null, color: null });
  assert.equal((await getCourse(first.id)).icon, null);
  assert.equal((await getCourse(first.id)).color, null);
  await deleteCourse(first.id);
  assert.equal(await getCourse(first.id), undefined);
  assert.equal((await getCourses()).length, 1);
  await assert.rejects(updateCourse(first.id, { name: 'Missing' }), /no longer exists/);
  assert.ok(calls.every(call => !call.sql.includes(second.name)));
  await deleteCourse(second.id);
  assert.deepEqual(await getCourses(), []);
});

test('custom colours and uploaded icons survive reads and partial edits', async () => {
  const icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=';
  const course = await createCourse({ name: 'Custom subject', icon, color: '#7b2d43' });
  assert.equal((await getCourse(course.id)).icon, icon);
  const edited = await updateCourse(course.id, { name: 'Renamed subject' });
  assert.equal(edited.icon, icon);
  assert.equal(edited.color, '#7b2d43');
  await updateCourse(course.id, { icon: '🧠', color: '#ffffff' });
  assert.equal((await getCourse(course.id)).icon, '🧠');
  await deleteCourse(course.id);
});

test('a new course defaults to not-started, 0% progress and unbookmarked, and each is filterable', async () => {
  const { CompletionStatus } = await load('../src/features/courses/lib/completion-status.ts');
  const course = await createCourse({ name: 'Chemistry' });
  assert.equal(course.status, CompletionStatus.NotStarted);
  assert.equal(course.progress, 0);
  assert.equal(course.bookmarked, false);

  const bookmarked = await createCourse({ name: 'Physics', status: CompletionStatus.InProgress, progress: 42, bookmarked: true });
  assert.equal(bookmarked.status, CompletionStatus.InProgress);
  assert.equal(bookmarked.progress, 42);
  assert.equal(bookmarked.bookmarked, true);

  assert.deepEqual((await getCourses({ bookmarked: true })).map((c) => c.id), [bookmarked.id]);
  assert.deepEqual((await getCourses({ status: CompletionStatus.InProgress })).map((c) => c.id), [bookmarked.id]);

  const updated = await updateCourse(course.id, { progress: 150, bookmarked: true });
  assert.equal(updated.progress, 100, 'progress is clamped to 100');
  assert.deepEqual((await getCourses({ bookmarked: true })).map((c) => c.id).sort(), [course.id, bookmarked.id].sort());

  await deleteCourse(course.id);
  await deleteCourse(bookmarked.id);
});
