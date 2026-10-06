import { Column, Index, PrimaryKey, Table } from "@chain/sdk/schema";

@Table()
export class QuizQuestion {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @Index({ name: "quiz_question_quiz" })
  quiz_id!: number;

  @Column({ default: 0 })
  position!: number;

  // QuestionKind: 1 multiple choice, 2 true/false, 3 short answer.
  @Column({ default: 1 })
  kind!: number;

  prompt!: string;

  // JSON list of options; multiple choice only.
  choices!: string | null;

  // The right option's index, "true"/"false", or the model answer.
  answer!: string;

  explanation!: string | null;

  page_id!: number | null;
}

// The name the rest of the app uses for a row of this table.
export type QuizQuestionRow = QuizQuestion;
