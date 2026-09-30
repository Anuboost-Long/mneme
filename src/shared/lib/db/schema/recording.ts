import { Column, ForeignKey, Index, PrimaryKey, Table } from "@chain/sdk/schema";

import { Page } from "./page";

@Table()
export class Recording {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @ForeignKey(() => Page, { onDelete: "cascade" })
  @Index({ name: "recording_page" })
  page_id!: number;

  name!: string;

  // A `desktop.files` reference, never a path.
  file_reference!: string;

  mime_type!: string;

  duration_ms!: number;

  transcript!: string | null;

  // JSON list of { startMs, endMs, text }, from Phase 17's transcription.
  segments!: string | null;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  @Column({ defaultSql: "datetime('now')" })
  updated_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type RecordingRow = Recording;
