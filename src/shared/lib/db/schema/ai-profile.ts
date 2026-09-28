import { Column, PrimaryKey, Table } from "@chain/sdk/schema";

@Table()
export class AiProfile {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  name!: string;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  @Column({ defaultSql: "datetime('now')" })
  updated_at!: string;

  language!: string | null;

  @Column({ default: 1 })
  explanation_level!: number;

  @Column({ default: 1 })
  tone!: number;

  @Column({ default: 1 })
  answer_length!: number;

  @Column({ default: 0 })
  keep_terms!: number;

  @Column({ default: 0 })
  use_examples!: number;

  @Column({ default: 0 })
  hints_for_assessed!: number;
}

// The name the rest of the app uses for a row of this table.
export type AiProfileRow = AiProfile;
