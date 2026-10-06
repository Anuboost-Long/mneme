import { Column, Index, PrimaryKey, Table } from "@chain/sdk/schema";

@Table()
export class StudySession {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @Index({ name: "study_session_module" })
  module_id!: number;

  quiz_id!: number | null;

  overview!: string;

  // JSON list of { name, summary, pageIds }.
  topics!: string;

  // JSON list of { topic, right, total }; null until the session is finished.
  results!: string | null;

  quiz_right!: number | null;

  quiz_total!: number | null;

  @Column({ default: 0 })
  cards_right!: number;

  @Column({ default: 0 })
  cards_wrong!: number;

  finished_at!: string | null;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type StudySessionRow = StudySession;
