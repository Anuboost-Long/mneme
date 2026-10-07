import { Column, ForeignKey, Index, PrimaryKey, Table } from "@chain/sdk/schema";
import { AgentConversation } from "./agent-conversation";

@Table()
export class AgentActivity {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @ForeignKey(() => AgentConversation, { onDelete: "set null" })
  @Index({ name: "agent_activity_conversation" })
  conversation_id!: number | null;

  tool!: string;

  @Column({ default: 1 })
  permission!: number;

  description!: string;

  outcome!: number;

  detail!: string | null;

  @Column({ defaultSql: "datetime('now')" })
  @Index({ name: "agent_activity_created" })
  created_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type AgentActivityRow = AgentActivity;
