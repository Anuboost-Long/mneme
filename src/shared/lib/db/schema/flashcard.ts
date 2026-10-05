import { Column, Index, PrimaryKey, Table } from "@chain/sdk/schema";

@Table()
export class Flashcard {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @Index({ name: "flashcard_module" })
  module_id!: number;

  // The page the card came from, if any.
  @Index({ name: "flashcard_page" })
  page_id!: number | null;

  front!: string;

  back!: string;

  // SM-2 scheduling: how much each correct review stretches the gap.
  @Column({ type: "real", default: 2.5 })
  ease!: number;

  @Column({ type: "real", default: 0 })
  interval_days!: number;

  @Column({ default: 0 })
  repetitions!: number;

  @Index({ name: "flashcard_due" })
  @Column({ defaultSql: "datetime('now')" })
  due_at!: string;

  @Column({ default: 0 })
  right_count!: number;

  @Column({ default: 0 })
  wrong_count!: number;

  last_reviewed_at!: string | null;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  @Column({ defaultSql: "datetime('now')" })
  updated_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type FlashcardRow = Flashcard;
