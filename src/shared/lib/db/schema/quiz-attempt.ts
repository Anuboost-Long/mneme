import { Column, Index, PrimaryKey, Table } from "@chain/sdk/schema";

@Table()
export class QuizAttempt {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @Index({ name: "quiz_attempt_quiz" })
  quiz_id!: number;

  score!: number;

  total!: number;

  // JSON list of { questionId, correct }.
  answers!: string;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type QuizAttemptRow = QuizAttempt;
