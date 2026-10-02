import { Column, Index, PrimaryKey, Table, Trigger } from "@chain/sdk/schema";

@Table()
@Trigger("highlight_page_delete", `CREATE TRIGGER highlight_page_delete BEFORE DELETE ON page BEGIN
      DELETE FROM highlight WHERE page_id = OLD.id;
    END`)
@Trigger("page_opened_on_insert", `CREATE TRIGGER page_opened_on_insert AFTER INSERT ON page WHEN NEW.opened_at IS NULL BEGIN
      UPDATE page SET opened_at = NEW.updated_at WHERE id = NEW.id;
    END`)
export class Page {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @Index({ name: "page_module" })
  module_id!: number;

  title!: string;

  content!: string | null;

  @Column({ defaultSql: "datetime('now')" })
  @Index({ name: "page_created" })
  created_at!: string;

  @Column({ defaultSql: "datetime('now')" })
  @Index({ name: "page_updated" })
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
  // page doesn't count as editing it. A page never opened since it was
  // made counts as opened then.
  @Index({ name: "page_opened" })
  opened_at!: string | null;

  // When it moved to Recently deleted. Everything deleted along with it gets
  // the same value, which is how a restore finds what to bring back.
  @Index({ name: "page_deleted", where: "deleted_at IS NOT NULL" })
  deleted_at!: string | null;
}

// The name the rest of the app uses for a row of this table.
export type PageRow = Page;
