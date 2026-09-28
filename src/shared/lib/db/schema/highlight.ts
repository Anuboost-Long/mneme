import { Column, ForeignKey, Index, PrimaryKey, Table } from "@chain/sdk/schema";
import { Page } from "./page";

@Table("highlight", { unique: [["page_id", "ref"]] })
export class Highlight {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @ForeignKey(() => Page, { onDelete: "cascade" })
  @Index({ name: "highlight_page" })
  page_id!: number;

  @Index({ name: "highlight_module" })
  module_id!: number;

  ref!: string;

  html!: string;

  position!: number;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  orphaned_at!: string | null;
}

// The name the rest of the app uses for a row of this table.
export type HighlightRow = Highlight;
