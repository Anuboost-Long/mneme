import type { QuizQuestionRow } from "@/shared/lib/db/schema/quiz-question";
import type { QuizRow } from "@/shared/lib/db/schema/quiz";

export enum QuestionKind {
  MultipleChoice = 1,
  TrueFalse = 2,
  ShortAnswer = 3
}

export const questionKinds = [QuestionKind.MultipleChoice, QuestionKind.TrueFalse, QuestionKind.ShortAnswer];

export const questionKindLabels: Record<QuestionKind, string> = {
  [QuestionKind.MultipleChoice]: "Multiple choice",
  [QuestionKind.TrueFalse]: "True or false",
  [QuestionKind.ShortAnswer]: "Short answer"
};

export type Question = Omit<QuizQuestionRow, "kind" | "choices"> & {
  kind: QuestionKind;
  choices: string[] | null;
  page_title: string | null;
};

export type QuestionDraft = Pick<Question, "kind" | "prompt" | "choices" | "answer" | "explanation" | "page_id">;

export type Quiz = QuizRow & {
  page_title: string | null;
  question_count: number;
  attempt_count: number;
  last_score: number | null;
  best_score: number | null;
};

export type AttemptAnswer = { questionId: number; correct: boolean };

export function rightAnswer(question: Pick<Question, "kind" | "choices" | "answer">) {
  switch (question.kind) {
    case QuestionKind.MultipleChoice:
      return question.choices?.[Number(question.answer)] ?? question.answer;
    case QuestionKind.TrueFalse:
      return question.answer === "true" ? "True" : "False";
    default:
      return question.answer;
  }
}

// Short answers are marked by the student, so only the other kinds are checked here.
export function isRight(question: Pick<Question, "kind" | "answer">, response: string) {
  return question.kind !== QuestionKind.ShortAnswer && response === question.answer;
}
