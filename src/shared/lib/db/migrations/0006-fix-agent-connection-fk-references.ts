import type { Migration } from "@chain/sdk";

// Migration 0005's `ALTER TABLE agent_connection RENAME TO
// agent_connection_old` rewrote every textual reference to the old name
// throughout the schema — its own comment already covers the trigger
// bodies this broke, but missed that agent_conversation.agent_connection_id
// and agent_usage.agent_connection_id declare their REFERENCES target
// inside their own CREATE TABLE statements, not a trigger, and those got
// silently rewritten the same way. Both tables have pointed at a
// nonexistent "agent_connection_old" ever since, which surfaced live as
// "no such table: main.agent_connection_old" once real chat turns
// started recording usage.
//
// Rebuilding through a "_new" table sidesteps the rewrite instead of
// repeating it: nothing in the schema mentions "agent_conversation_new"
// or "agent_usage_new", so renaming one into place afterward has nothing
// else to rewrite — unlike renaming the live table names themselves.
export const fixAgentConnectionFkReferences: Migration = {
  version: 6,
  sql: `
    DROP TABLE IF EXISTS agent_conversation_new;
    CREATE TABLE agent_conversation_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_connection_id INTEGER NOT NULL REFERENCES agent_connection(id),
      title TEXT,
      external_session_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO agent_conversation_new (id, agent_connection_id, title, external_session_id, created_at, updated_at)
      SELECT id, agent_connection_id, title, external_session_id, created_at, updated_at FROM agent_conversation;
    DROP TABLE agent_conversation;
    ALTER TABLE agent_conversation_new RENAME TO agent_conversation;

    DROP TABLE IF EXISTS agent_usage_new;
    CREATE TABLE agent_usage_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_connection_id INTEGER NOT NULL REFERENCES agent_connection(id) ON DELETE CASCADE,
      conversation_id INTEGER REFERENCES agent_conversation(id) ON DELETE SET NULL,
      invoked_at TEXT NOT NULL DEFAULT (datetime('now')),
      duration_ms INTEGER,
      input_tokens INTEGER,
      output_tokens INTEGER,
      cost_usd REAL,
      exit_code INTEGER
    );
    INSERT INTO agent_usage_new (id, agent_connection_id, conversation_id, invoked_at, duration_ms, input_tokens, output_tokens, cost_usd, exit_code)
      SELECT id, agent_connection_id, conversation_id, invoked_at, duration_ms, input_tokens, output_tokens, cost_usd, exit_code FROM agent_usage;
    DROP TABLE agent_usage;
    ALTER TABLE agent_usage_new RENAME TO agent_usage;

    CREATE INDEX IF NOT EXISTS agent_conversation_connection ON agent_conversation(agent_connection_id);
    CREATE INDEX IF NOT EXISTS agent_conversation_updated ON agent_conversation(updated_at);
    CREATE INDEX IF NOT EXISTS agent_usage_connection ON agent_usage(agent_connection_id);
    CREATE INDEX IF NOT EXISTS agent_usage_conversation ON agent_usage(conversation_id);

    -- DROP TABLE auto-drops triggers defined ON that table, so these need
    -- recreating; their bodies are unchanged from 0004/0005.
    DROP TRIGGER IF EXISTS agent_conversation_identity;
    CREATE TRIGGER agent_conversation_identity BEFORE UPDATE OF agent_connection_id ON agent_conversation
    WHEN NEW.agent_connection_id != OLD.agent_connection_id BEGIN
      SELECT RAISE(ABORT, 'A conversation cannot switch agents.');
    END;
    DROP TRIGGER IF EXISTS agent_conversation_delete;
    CREATE TRIGGER agent_conversation_delete BEFORE DELETE ON agent_conversation BEGIN
      DELETE FROM agent_message WHERE conversation_id = OLD.id;
      UPDATE agent_usage SET conversation_id = NULL WHERE conversation_id = OLD.id;
    END;
    DROP TRIGGER IF EXISTS agent_conversation_insert;
    CREATE TRIGGER agent_conversation_insert BEFORE INSERT ON agent_conversation BEGIN
      SELECT RAISE(ABORT, 'This agent connection no longer exists.')
        WHERE NOT EXISTS (SELECT 1 FROM agent_connection WHERE id = NEW.agent_connection_id);
    END;
    DROP TRIGGER IF EXISTS agent_usage_insert;
    CREATE TRIGGER agent_usage_insert BEFORE INSERT ON agent_usage BEGIN
      SELECT RAISE(ABORT, 'This agent connection no longer exists.')
        WHERE NOT EXISTS (SELECT 1 FROM agent_connection WHERE id = NEW.agent_connection_id);
      SELECT RAISE(ABORT, 'Usage must belong to the conversation''s agent connection.')
        WHERE NEW.conversation_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM agent_conversation WHERE id = NEW.conversation_id
            AND agent_connection_id = NEW.agent_connection_id
        );
    END;
  `,
};
