import type { Migration } from "@chain/sdk";

// SQLite has no ALTER TABLE for a column's CHECK constraint, so widening
// `kind` means rebuilding the table — copy, drop, recreate under the same
// name.
//
// Two real failure modes hit live during development, both from
// `execute_batch` not being transactional (a failure partway through
// leaves everything before it committed) combined with this running
// again on every dev-server reload until a version is actually recorded
// in `_chain_migrations`: (1) `ALTER TABLE ... RENAME` rewrites *every*
// reference to the old name throughout the whole schema, not just
// triggers defined directly on that table — agent_conversation_insert/
// agent_usage_insert (defined on OTHER tables, just mentioning
// agent_connection in a subquery) silently got repointed at
// "agent_connection_old" as a side effect. (2) agent_connection_delete/
// agent_connection_identity (defined ON this table) got renamed to the
// "_old" table alongside it, so recreating them under the same names on
// the new table collided with themselves still existing on the old one
// if the DROP TABLE before them hadn't actually gone through yet.
// `DROP TABLE/TRIGGER IF EXISTS` throughout makes re-running this from
// any partial state converge to the same correct end state instead of
// compounding — this is what actually repairing the live dev database
// required, applied here so a from-scratch run can't hit it at all.
export const widenAgentKind: Migration = {
  version: 5,
  sql: `
    DROP TABLE IF EXISTS agent_connection_old;
    ALTER TABLE agent_connection RENAME TO agent_connection_old;

    DROP TRIGGER IF EXISTS agent_connection_delete;
    DROP TRIGGER IF EXISTS agent_connection_identity;

    CREATE TABLE agent_connection (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL CHECK (length(trim(name)) > 0),
      kind TEXT NOT NULL CHECK (kind IN ('claude', 'codex', 'gemini', 'copilot', 'cursor', 'custom')),
      command TEXT NOT NULL CHECK (length(trim(command)) > 0),
      args TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO agent_connection (id, name, kind, command, args, created_at, updated_at)
      SELECT id, name, kind, command, args, created_at, updated_at FROM agent_connection_old;

    DROP TABLE IF EXISTS agent_connection_old;

    CREATE TRIGGER agent_connection_delete BEFORE DELETE ON agent_connection BEGIN
      SELECT RAISE(ABORT, 'Delete this connection’s conversations first.')
        WHERE EXISTS (SELECT 1 FROM agent_conversation WHERE agent_connection_id = OLD.id);
      DELETE FROM agent_usage WHERE agent_connection_id = OLD.id;
    END;
    CREATE TRIGGER agent_connection_identity BEFORE UPDATE OF kind, command, args ON agent_connection
    WHEN (NEW.kind != OLD.kind OR NEW.command != OLD.command OR coalesce(NEW.args, '[]') != coalesce(OLD.args, '[]'))
      AND EXISTS (SELECT 1 FROM agent_conversation WHERE agent_connection_id = OLD.id)
    BEGIN
      SELECT RAISE(ABORT, 'This connection has conversations. Add another connection to use a different command.');
    END;

    -- Repoints these two at "agent_connection" in case a prior partial
    -- run's RENAME already corrupted them — a no-op re-creation if it
    -- didn't (they'd already say "agent_connection").
    DROP TRIGGER IF EXISTS agent_conversation_insert;
    CREATE TRIGGER agent_conversation_insert BEFORE INSERT ON agent_conversation BEGIN
      SELECT RAISE(ABORT, 'This agent connection no longer exists.')
        WHERE NOT EXISTS (SELECT 1 FROM agent_connection WHERE id = NEW.agent_connection_id);
    END;
    DROP TRIGGER IF EXISTS agent_usage_insert;
    CREATE TRIGGER agent_usage_insert BEFORE INSERT ON agent_usage BEGIN
      SELECT RAISE(ABORT, 'This agent connection no longer exists.')
        WHERE NOT EXISTS (SELECT 1 FROM agent_connection WHERE id = NEW.agent_connection_id);
      SELECT RAISE(ABORT, 'Usage must belong to the conversation’s agent connection.')
        WHERE NEW.conversation_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM agent_conversation WHERE id = NEW.conversation_id
            AND agent_connection_id = NEW.agent_connection_id
        );
    END;
  `,
};
