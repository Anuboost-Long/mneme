import type { Migration } from "@chain/sdk";

export const agentChat: Migration = {
  version: 4,
  sql: `
    CREATE TABLE agent_connection (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL CHECK (length(trim(name)) > 0),
      kind TEXT NOT NULL CHECK (kind IN ('claude', 'codex', 'gemini', 'custom')),
      command TEXT NOT NULL CHECK (length(trim(command)) > 0),
      args TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE agent_conversation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_connection_id INTEGER NOT NULL REFERENCES agent_connection(id),
      title TEXT,
      external_session_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE agent_message (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES agent_conversation(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'error')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE agent_usage (
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
    CREATE INDEX agent_conversation_connection ON agent_conversation(agent_connection_id);
    CREATE INDEX agent_conversation_updated ON agent_conversation(updated_at);
    CREATE INDEX agent_message_conversation ON agent_message(conversation_id, id);
    CREATE INDEX agent_usage_connection ON agent_usage(agent_connection_id);
    CREATE INDEX agent_usage_conversation ON agent_usage(conversation_id);

    -- Storage does not currently enable SQLite foreign keys. Triggers keep
    -- these operations atomic with either foreign-key setting.
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
    CREATE TRIGGER agent_conversation_insert BEFORE INSERT ON agent_conversation BEGIN
      SELECT RAISE(ABORT, 'This agent connection no longer exists.')
        WHERE NOT EXISTS (SELECT 1 FROM agent_connection WHERE id = NEW.agent_connection_id);
    END;
    CREATE TRIGGER agent_conversation_identity BEFORE UPDATE OF agent_connection_id ON agent_conversation
    WHEN NEW.agent_connection_id != OLD.agent_connection_id BEGIN
      SELECT RAISE(ABORT, 'A conversation cannot switch agents.');
    END;
    CREATE TRIGGER agent_conversation_delete BEFORE DELETE ON agent_conversation BEGIN
      DELETE FROM agent_message WHERE conversation_id = OLD.id;
      UPDATE agent_usage SET conversation_id = NULL WHERE conversation_id = OLD.id;
    END;
    CREATE TRIGGER agent_message_insert BEFORE INSERT ON agent_message BEGIN
      SELECT RAISE(ABORT, 'This conversation no longer exists.')
        WHERE NOT EXISTS (SELECT 1 FROM agent_conversation WHERE id = NEW.conversation_id);
    END;
    CREATE TRIGGER agent_message_touch AFTER INSERT ON agent_message BEGIN
      UPDATE agent_conversation SET updated_at = datetime('now'),
        title = CASE WHEN NEW.role = 'user' AND title IS NULL THEN substr(NEW.content, 1, 80) ELSE title END
        WHERE id = NEW.conversation_id;
    END;
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
