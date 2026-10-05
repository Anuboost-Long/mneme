import { Index, PrimaryKey, Table } from "@chain/sdk/schema";

@Table()
export class PagePassage {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @Index({ name: "page_passage_page" })
  page_id!: number;

  position!: number;

  text!: string;

  // The passage's embedding as base64 Float32 bytes: storage returns
  // BLOBs as null, so the vector travels as text.
  vector!: string;

  @Index({ name: "page_passage_model" })
  model!: string;

  // The page's updated_at when this passage was embedded.
  source_updated_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type PagePassageRow = PagePassage;
