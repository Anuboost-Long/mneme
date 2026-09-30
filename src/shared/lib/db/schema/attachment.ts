import { Column, PrimaryKey, Table } from "@chain/sdk/schema";

@Table()
export class Attachment {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  page_id!: number;

  file_name!: string;

  file_path!: string;

  mime_type!: string | null;

  size_bytes!: number | null;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type AttachmentRow = Attachment;
