import { Column, PrimaryKey, Table, Trigger } from "@chain/sdk/schema";

@Table()
@Trigger("agent_connection_delete", `CREATE TRIGGER agent_connection_delete BEFORE DELETE ON agent_connection BEGIN
      SELECT RAISE(ABORT, 'Delete this connection’s conversations first.')
        WHERE EXISTS (SELECT 1 FROM agent_conversation WHERE agent_connection_id = OLD.id);
      DELETE FROM agent_usage WHERE agent_connection_id = OLD.id;
    END`)
@Trigger("agent_connection_identity", `CREATE TRIGGER agent_connection_identity BEFORE UPDATE OF kind, command, args ON agent_connection
    WHEN (NEW.kind != OLD.kind OR NEW.command != OLD.command OR coalesce(NEW.args, '[]') != coalesce(OLD.args, '[]'))
      AND EXISTS (SELECT 1 FROM agent_conversation WHERE agent_connection_id = OLD.id)
    BEGIN
      SELECT RAISE(ABORT, 'This connection has conversations. Add another connection to use a different command.');
    END`)
export class AgentConnection {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @Column({ check: "length(trim(name)) > 0" })
  name!: string;

  @Column({ check: "kind IN ('claude', 'codex', 'gemini', 'copilot', 'cursor', 'custom')" })
  kind!: "claude" | "codex" | "gemini" | "copilot" | "cursor" | "custom";

  @Column({ check: "length(trim(command)) > 0" })
  command!: string;

  args!: string | null;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  @Column({ defaultSql: "datetime('now')" })
  updated_at!: string;

  model!: string | null;
}

// The name the rest of the app uses for a row of this table.
export type AgentConnectionRow = AgentConnection;
