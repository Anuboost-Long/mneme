import { Column, ForeignKey, Index, PrimaryKey, Table, Trigger } from "@chain/sdk/schema";
import { AgentConversation } from "./agent-conversation";

@Table()
@Index({ name: "agent_message_conversation", columns: ["conversation_id", "id"] })
@Trigger("agent_message_insert", `CREATE TRIGGER agent_message_insert BEFORE INSERT ON agent_message BEGIN
      SELECT RAISE(ABORT, 'This conversation no longer exists.')
        WHERE NOT EXISTS (SELECT 1 FROM agent_conversation WHERE id = NEW.conversation_id);
    END`)
@Trigger("agent_message_touch", `CREATE TRIGGER agent_message_touch AFTER INSERT ON agent_message BEGIN
      UPDATE agent_conversation SET updated_at = datetime('now'),
        title = CASE WHEN NEW.role = 'user' AND title IS NULL THEN substr(NEW.content, 1, 80) ELSE title END
        WHERE id = NEW.conversation_id;
    END`)
export class AgentMessage {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @ForeignKey(() => AgentConversation, { onDelete: "cascade" })
  conversation_id!: number;

  @Column({ check: "role IN ('user', 'assistant', 'tool', 'error')" })
  role!: "user" | "assistant" | "tool" | "error";

  content!: string;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  attachments!: string | null;
}

// The name the rest of the app uses for a row of this table.
export type AgentMessageRow = AgentMessage;
