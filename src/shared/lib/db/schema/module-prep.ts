import { Column, PrimaryKey, Table } from "@chain/sdk/schema";

@Table()
export class ModulePrep {
  @PrimaryKey()
  module_id!: number;

  // JSON list of { name, summary, pageIds }.
  @Column({ default: "[]" })
  topics!: string;

  summary_page_id!: number | null;

  notes_page_id!: number | null;

  // The practice quiz.
  quiz_id!: number | null;

  // JSON list of what couldn't be read, each saying why.
  @Column({ default: "[]" })
  unread!: string;

  prepared_at!: string | null;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type ModulePrepRow = ModulePrep;
