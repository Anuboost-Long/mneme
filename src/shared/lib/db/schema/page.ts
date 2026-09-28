import { Column, PrimaryKey, Table, Trigger } from "@chain/sdk/schema";

@Table()
@Trigger("highlight_page_delete", `CREATE TRIGGER highlight_page_delete BEFORE DELETE ON page BEGIN
      DELETE FROM highlight WHERE page_id = OLD.id;
    END`)
export class Page {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  module_id!: number;

  title!: string;

  content!: string | null;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  @Column({ defaultSql: "datetime('now')" })
  updated_at!: string;

  @Column({ default: 1 })
  status!: number;

  @Column({ default: 0 })
  progress!: number;

  @Column({ default: 0 })
  bookmarked!: number;

  @Column({ default: 1 })
  type!: number;
}

// The name the rest of the app uses for a row of this table.
export type PageRow = Page;
