import { addCards } from "@/features/flashcards/lib/card/actions";
import type { CardDraft } from "@/features/flashcards/lib/card/types";
import { createQuiz } from "@/features/quizzes/lib/quiz/actions";
import type { QuestionDraft } from "@/features/quizzes/lib/quiz/types";

import { deleteSessionRow, insertSession, setResults } from "./table";
import type { SessionResults, Topic } from "./types";

export { deleteOrphanSessions, getModuleSessions, getSession } from "./table";

export async function createSession(
  module: { id: number; name: string },
  overview: string,
  topics: Topic[],
  questions: QuestionDraft[],
  cards: CardDraft[]
) {
  if (!topics.length) throw new Error("The agent didn’t find any topics. Try again.");
  const quizId = await createQuiz(module.id, null, `Study session: ${module.name}`, questions);
  if (cards.length) await addCards(module.id, cards);
  return insertSession(module.id, quizId, overview.trim(), topics);
}

export async function saveResults(id: number, results: SessionResults) {
  await setResults(id, results);
}

export async function deleteSession(id: number) {
  await deleteSessionRow(id);
}
