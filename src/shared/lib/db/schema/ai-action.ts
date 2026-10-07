import { Column, ForeignKey, Index, PrimaryKey, Table } from "@chain/sdk/schema";

import { ActionPack } from "./action-pack";

@Table()
export class AiAction {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  name!: string;

  prompt!: string;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  @Column({ defaultSql: "datetime('now')" })
  updated_at!: string;

  @Column({ default: 0 })
  position!: number;

  icon!: string | null;

  @Column({ default: 1 })
  scope!: number;

  @Column({ default: 1 })
  output!: number;

  page_types!: string | null;

  @Index({ name: "ai_action_pack" })
  @ForeignKey(() => ActionPack, { onDelete: "cascade" })
  pack_id!: number | null;

  @Column({ default: 1 })
  enabled!: number;
}

// The name the rest of the app uses for a row of this table.
export type AiActionRow = AiAction;
