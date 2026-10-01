import { register } from 'node:module';
import { DatabaseSync } from 'node:sqlite';

register('./hooks.mjs', import.meta.url);
const { Table } = await import('../../node_modules/@chain/sdk/src/storage-table.ts');

export function useTestDesktop(path = ':memory:') {
  const database = new DatabaseSync(path);
  const calls = [];
  const deletedFiles = [];
  const storage = {
    migrate: async (migrations) => {
      database.exec('CREATE TABLE IF NOT EXISTS test_applied_migration (version INTEGER PRIMARY KEY)');
      const applied = new Set(database.prepare('SELECT version FROM test_applied_migration').all().map((row) => row.version));
      const { foreign_keys } = database.prepare('PRAGMA foreign_keys').get();
      database.exec('PRAGMA foreign_keys = OFF; PRAGMA legacy_alter_table = ON');
      try {
        for (const migration of migrations.filter((migration) => !applied.has(migration.version))) {
          database.exec(migration.sql);
          database.prepare('INSERT INTO test_applied_migration (version) VALUES (?)').run(migration.version);
        }
      } finally {
        database.exec(`PRAGMA legacy_alter_table = OFF; PRAGMA foreign_keys = ${foreign_keys ? 'ON' : 'OFF'}`);
      }
    },
    query: async (sql, params = []) => {
      calls.push({ sql, params });
      return database.prepare(sql).all(...params);
    },
    execute: async (sql, params = []) => {
      calls.push({ sql, params });
      const result = database.prepare(sql).run(...params);
      return { rowsAffected: Number(result.changes), lastInsertId: Number(result.lastInsertRowid) };
    },
    table: (name) => new Table(storage, name),
    transaction: async (work) => {
      database.exec('BEGIN');
      try {
        const result = await work(storage);
        database.exec('COMMIT');
        return result;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
  };
  globalThis.chainDesktop = {
    storage,
    files: {
      delete: async (reference) => {
        deletedFiles.push(reference);
      },
    },
  };
  return { database, calls, deletedFiles };
}
