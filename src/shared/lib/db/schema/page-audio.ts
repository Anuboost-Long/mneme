import { Column, ForeignKey, PrimaryKey, Table } from "@chain/sdk/schema";

import { Page } from "./page";

// A page's audiobook: its read-aloud compiled into one file, made and
// deleted only when the user asks.
@Table()
export class PageAudio {
  @PrimaryKey()
  @ForeignKey(() => Page, { onDelete: "cascade" })
  page_id!: number;

  // A `desktop.files` reference, never a path.
  file_reference!: string;

  duration_ms!: number;

  voice_id!: string;

  voice_name!: string;

  @Column({ type: "real" })
  speed!: number;

  // JSON list of { chunk, start, end, text, from, to }: each sentence's
  // place on the page (chunk and character range) and in the audio (seconds).
  sentences!: string;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type PageAudioRow = PageAudio;
