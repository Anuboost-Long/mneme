import type { AttemptAnswer } from "@/features/quizzes/lib/quiz/types";
import type { StudySessionRow } from "@/shared/lib/db/schema/study-session";

export type Topic = { name: string; summary: string; pageIds: number[] };

export type TopicResult = { topic: string; right: number; total: number };

export type StudySession = Omit<StudySessionRow, "topics" | "results"> & {
  topics: Topic[];
  results: TopicResult[] | null;
};

export type CardResult = { cardId: number; pageId: number | null; right: boolean };

export type SessionResults = {
  topics: TopicResult[];
  quizRight: number | null;
  quizTotal: number | null;
  cardsRight: number;
  cardsWrong: number;
};

const WEAK_BELOW = 0.7;

export function sessionResults(
  topics: Topic[],
  questions: { id: number; topic: string | null }[],
  answers: AttemptAnswer[] | null,
  cards: CardResult[]
): SessionResults {
  const correct = new Map(answers?.map((answer) => [answer.questionId, answer.correct]));
  const firstGrades = [
    ...new Map([...cards].reverse().map((card) => [card.cardId, card])).values()
  ];
  return {
    topics: topics.map(({ name, pageIds }) => {
      const asked = questions.filter(
        (question) => question.topic === name && correct.has(question.id)
      );
      const graded = firstGrades.filter(
        (card) => card.pageId !== null && pageIds.includes(card.pageId)
      );
      return {
        topic: name,
        right:
          asked.filter((question) => correct.get(question.id)).length +
          graded.filter((card) => card.right).length,
        total: asked.length + graded.length
      };
    }),
    quizRight: answers ? answers.filter((answer) => answer.correct).length : null,
    quizTotal: answers ? answers.length : null,
    cardsRight: firstGrades.filter((card) => card.right).length,
    cardsWrong: firstGrades.filter((card) => !card.right).length
  };
}

export function weakTopics(results: TopicResult[]) {
  return results
    .filter((result) => result.total > 0 && result.right / result.total < WEAK_BELOW)
    .sort((a, b) => a.right / a.total - b.right / b.total);
}
