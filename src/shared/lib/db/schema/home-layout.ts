import { Column, Index, PrimaryKey, Table } from "@chain/sdk/schema";

// A Home layout the user saved to reuse; applying one replaces every widget.
@Table()
export class HomeLayout {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @Index({ name: "home_layout_name", unique: true })
  name!: string;

  // The widgets as JSON, in order: [{ kind, size, config }].
  widgets!: string;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  @Column({ defaultSql: "datetime('now')" })
  updated_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type HomeLayoutRow = HomeLayout;
