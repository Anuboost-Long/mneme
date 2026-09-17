import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import ts from 'typescript';

// 0003 converts module.status and page.type from the TEXT values 0001
// shipped with to the INTEGER enum values 0002/completion-status.ts and
// pages.ts now use. This is the one migration that can silently mangle
// real, already-saved rows if the CASE mapping drifts from the enum
// declarations it mirrors — worth its own focused test, applying
// 0001+0002 to seed pre-migration rows before running 0003 for real.
async function loadMigration(name) {
  const source = await readFile(new URL(`../src/shared/lib/db/migrations/${name}.ts`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  const module = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  return Object.values(module)[0].sql;
}

test('0003 converts existing TEXT status/type values to their matching numeric enum member', async () => {
  const database = new DatabaseSync(':memory:');
  database.exec(await loadMigration('0001-initial'));
  database.exec(await loadMigration('0002-completion-tracking'));

  database.exec("INSERT INTO course (id, name) VALUES (1, 'Biology')");
  database.exec("INSERT INTO module (id, course_id, name, status) VALUES (1, 1, 'M1', 'not_started')");
  database.exec("INSERT INTO module (id, course_id, name, status) VALUES (2, 1, 'M2', 'in_progress')");
  database.exec("INSERT INTO module (id, course_id, name, status) VALUES (3, 1, 'M3', 'completed')");
  database.exec("INSERT INTO module (id, course_id, name, status) VALUES (4, 1, 'M4', 'revision_needed')");
  database.exec("INSERT INTO page (id, module_id, title, type) VALUES (1, 1, 'P1', 'lesson')");
  database.exec("INSERT INTO page (id, module_id, title, type) VALUES (2, 1, 'P2', 'lecture')");
  database.exec("INSERT INTO page (id, module_id, title, type) VALUES (3, 1, 'P3', 'exercise')");
  database.exec("INSERT INTO page (id, module_id, title, type) VALUES (4, 1, 'P4', 'discussion')");
  database.exec("INSERT INTO page (id, module_id, title, type) VALUES (5, 1, 'P5', 'assignment')");
  database.exec("INSERT INTO page (id, module_id, title, type) VALUES (6, 1, 'P6', 'notes')");
  database.exec("INSERT INTO page (id, module_id, title, type) VALUES (7, 1, 'P7', 'reading')");
  database.exec("INSERT INTO page (id, module_id, title, type) VALUES (8, 1, 'P8', 'revision')");
  database.exec("INSERT INTO page (id, module_id, title, type) VALUES (9, 1, 'P9', 'custom')");

  database.exec(await loadMigration('0003-numeric-enums'));

  assert.deepEqual(
    database.prepare('SELECT id, status FROM module ORDER BY id').all().map((row) => ({ ...row })),
    [{ id: 1, status: 1 }, { id: 2, status: 2 }, { id: 3, status: 3 }, { id: 4, status: 4 }],
  );
  assert.deepEqual(
    database.prepare('SELECT id, type FROM page ORDER BY id').all().map((row) => ({ ...row })),
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => ({ id, type: id })),
  );
  for (const { status } of database.prepare('SELECT status FROM module').all()) assert.equal(typeof status, 'number');
  for (const { type } of database.prepare('SELECT type FROM page').all()) assert.equal(typeof type, 'number');
});
