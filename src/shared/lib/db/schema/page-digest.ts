import { Column, PrimaryKey, Table } from "@chain/sdk/schema";

// A long page's material condensed for Prepare module.
@Table()
export class PageDigest {
  @PrimaryKey()
  page_id!: number;

  // Changes when the page's material does, so a stale digest isn't reused.
  source_hash!: string;

  digest!: string;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type PageDigestRow = PageDigest;
