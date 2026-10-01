import { Column, Index, PrimaryKey, Table, Trigger } from "@chain/sdk/schema";

@Table()
@Trigger("highlight_page_delete", `CREATE TRIGGER highlight_page_delete BEFORE DELETE ON page BEGIN
      DELETE FROM highlight WHERE page_id = OLD.id;
    END`)
export class Page {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @Index({ name: "page_module" })
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

  // A preset name, an emoji, or a small data URL, like course.icon.
  icon!: string | null;

  // A `desktop.files` reference to the cover image, never a path.
  cover!: string | null;

  // Order within its module; ties fall back to creation order.
  @Column({ default: 0 })
  position!: number;

  // Last time the page was opened; separate from updated_at so reading a
  // page doesn't count as editing it.
  opened_at!: string | null;

  // When it moved to Recently deleted. Everything deleted along with it gets
  // the same value, which is how a restore finds what to bring back.
  deleted_at!: string | null;
}

// The name the rest of the app uses for a row of this table.
export type PageRow = Page;
