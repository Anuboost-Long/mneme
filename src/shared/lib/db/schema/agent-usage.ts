import { Column, ForeignKey, Index, PrimaryKey, Table, Trigger } from "@chain/sdk/schema";
import { AgentConnection } from "./agent-connection";
import { AgentConversation } from "./agent-conversation";

@Table()
@Trigger("agent_usage_insert", `CREATE TRIGGER agent_usage_insert BEFORE INSERT ON agent_usage BEGIN
      SELECT RAISE(ABORT, 'This agent connection no longer exists.')
        WHERE NOT EXISTS (SELECT 1 FROM agent_connection WHERE id = NEW.agent_connection_id);
      SELECT RAISE(ABORT, 'Usage must belong to the conversation''s agent connection.')
        WHERE NEW.conversation_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM agent_conversation WHERE id = NEW.conversation_id
            AND agent_connection_id = NEW.agent_connection_id
        );
    END`)
export class AgentUsage {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @ForeignKey(() => AgentConnection, { onDelete: "cascade" })
  @Index({ name: "agent_usage_connection" })
  agent_connection_id!: number;

  @ForeignKey(() => AgentConversation, { onDelete: "set null" })
  @Index({ name: "agent_usage_conversation" })
  conversation_id!: number | null;

  @Column({ defaultSql: "datetime('now')" })
  @Index({ name: "agent_usage_invoked" })
  invoked_at!: string;

  duration_ms!: number | null;

  input_tokens!: number | null;

  output_tokens!: number | null;

  @Column({ type: "real" })
  cost_usd!: number | null;

  exit_code!: number | null;
}

// The name the rest of the app uses for a row of this table.
export type AgentUsageRow = AgentUsage;
