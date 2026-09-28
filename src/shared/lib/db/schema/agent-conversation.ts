import { Column, ForeignKey, Index, PrimaryKey, Table, Trigger } from "@chain/sdk/schema";
import { AgentConnection } from "./agent-connection";

@Table()
@Trigger("agent_conversation_delete", `CREATE TRIGGER agent_conversation_delete BEFORE DELETE ON agent_conversation BEGIN
      DELETE FROM agent_message WHERE conversation_id = OLD.id;
      UPDATE agent_usage SET conversation_id = NULL WHERE conversation_id = OLD.id;
    END`)
@Trigger("agent_conversation_identity", `CREATE TRIGGER agent_conversation_identity BEFORE UPDATE OF agent_connection_id ON agent_conversation
    WHEN NEW.agent_connection_id != OLD.agent_connection_id BEGIN
      SELECT RAISE(ABORT, 'A conversation cannot switch agents.');
    END`)
@Trigger("agent_conversation_insert", `CREATE TRIGGER agent_conversation_insert BEFORE INSERT ON agent_conversation BEGIN
      SELECT RAISE(ABORT, 'This agent connection no longer exists.')
        WHERE NOT EXISTS (SELECT 1 FROM agent_connection WHERE id = NEW.agent_connection_id);
    END`)
export class AgentConversation {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @ForeignKey(() => AgentConnection)
  @Index({ name: "agent_conversation_connection" })
  agent_connection_id!: number;

  title!: string | null;

  external_session_id!: string | null;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  @Index({ name: "agent_conversation_updated" })
  @Column({ defaultSql: "datetime('now')" })
  updated_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type AgentConversationRow = AgentConversation;
