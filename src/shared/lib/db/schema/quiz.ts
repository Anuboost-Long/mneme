import { Column, Index, PrimaryKey, Table } from "@chain/sdk/schema";

@Table()
export class Quiz {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @Index({ name: "quiz_module" })
  module_id!: number;

  // The page the quiz covers; null when it covers the whole module.
  page_id!: number | null;

  title!: string;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  @Column({ defaultSql: "datetime('now')" })
  updated_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type QuizRow = Quiz;
