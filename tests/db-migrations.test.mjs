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

test('0011 adds ai_action.position and seeds the default quick actions in menu order', async () => {
  const database = new DatabaseSync(':memory:');
  database.exec(await loadMigration('0001-initial'));
  database.exec(await loadMigration('0011-ai-action-defaults'));

  const actions = database.prepare('SELECT name, prompt, position FROM ai_action ORDER BY position').all();
  assert.deepEqual(actions.map((action) => action.name), [
    'Summarize', 'Explain', 'Simplify', 'Translate to English',
    'Find key points', 'Create revision notes', 'Extract tasks', 'Organize notes',
  ]);
  assert.ok(actions.every((action) => action.prompt.length > 0));
});

test('0012 replaces ai_action.output_mode with numeric scope/output and keeps the seeded defaults', async () => {
  const database = new DatabaseSync(':memory:');
  database.exec(await loadMigration('0001-initial'));
  database.exec(await loadMigration('0011-ai-action-defaults'));
  database.exec(await loadMigration('0012-custom-ai-actions'));

  const columns = database.prepare('PRAGMA table_info(ai_action)').all().map((column) => column.name);
  assert.ok(!columns.includes('output_mode'));
  for (const column of ['icon', 'scope', 'output', 'page_types']) assert.ok(columns.includes(column), column);

  const actions = database.prepare('SELECT scope, output, page_types FROM ai_action').all();
  assert.equal(actions.length, 8);
  assert.ok(actions.every((action) => action.scope === 1 && action.output === 1 && action.page_types === null));
});

test('0013 adds ai_profile and an optional course.ai_profile_id that existing courses leave unset', async () => {
  const database = new DatabaseSync(':memory:');
  database.exec(await loadMigration('0001-initial'));
  database.exec("INSERT INTO course (id, name) VALUES (1, 'Biology')");
  database.exec(await loadMigration('0013-ai-profiles'));

  assert.equal(database.prepare('SELECT ai_profile_id FROM course WHERE id = 1').get().ai_profile_id, null);
  database.exec("INSERT INTO ai_profile (id, name, instructions) VALUES (1, 'University study', 'Use Australian English.')");
  database.exec('UPDATE course SET ai_profile_id = 1 WHERE id = 1');
  const profile = database.prepare('SELECT ai_profile.name FROM ai_profile JOIN course ON course.ai_profile_id = ai_profile.id WHERE course.id = 1').get();
  assert.equal(profile.name, 'University study');
});

test('0014 swaps ai_profile.instructions for fixed settings and keeps existing profiles at "no preference"', async () => {
  const database = new DatabaseSync(':memory:');
  database.exec(await loadMigration('0001-initial'));
  database.exec(await loadMigration('0013-ai-profiles'));
  database.exec("INSERT INTO ai_profile (id, name, instructions) VALUES (1, 'Study', 'Anything at all')");
  database.exec(await loadMigration('0014-ai-profile-settings'));

  const columns = database.prepare('PRAGMA table_info(ai_profile)').all().map((column) => column.name);
  assert.ok(!columns.includes('instructions'));
  const profile = database.prepare('SELECT * FROM ai_profile WHERE id = 1').get();
  assert.equal(profile.name, 'Study');
  assert.equal(profile.language, null);
  for (const column of ['explanation_level', 'tone', 'answer_length']) assert.equal(profile[column], 1, column);
  for (const column of ['keep_terms', 'use_examples', 'hints_for_assessed']) assert.equal(profile[column], 0, column);
});

test('0015 adds agent_message.attachments and leaves existing messages without any', async () => {
  const database = new DatabaseSync(':memory:');
  for (const name of ['0001-initial', '0004-agent-chat']) database.exec(await loadMigration(name));
  database.exec("INSERT INTO agent_connection (id, name, kind, command) VALUES (1, 'Echo', 'custom', 'echo')");
  database.exec('INSERT INTO agent_conversation (id, agent_connection_id) VALUES (1, 1)');
  database.exec("INSERT INTO agent_message (conversation_id, role, content) VALUES (1, 'user', 'Before')");
  database.exec(await loadMigration('0015-agent-message-attachments'));

  database.exec(`INSERT INTO agent_message (conversation_id, role, content, attachments) VALUES (1, 'user', 'After', '[{"name":"notes.md","size":12}]')`);
  const rows = database.prepare('SELECT content, attachments FROM agent_message ORDER BY id').all();
  assert.deepEqual(rows.map((row) => ({ ...row })), [
    { content: 'Before', attachments: null },
    { content: 'After', attachments: '[{"name":"notes.md","size":12}]' },
  ]);
});
