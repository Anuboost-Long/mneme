import { deleteQuizRows, insertAttempt, insertQuiz } from "./table";
import type { AttemptAnswer, QuestionDraft } from "./types";

export { deleteOrphanQuizzes, getModuleQuizzes, getQuestions, getQuiz } from "./table";

export async function createQuiz(moduleId: number, pageId: number | null, title: string, questions: QuestionDraft[]) {
  if (!questions.length) throw new Error("The agent didn’t write any questions. Try again.");
  return insertQuiz({ module_id: moduleId, page_id: pageId, title: title.trim() || "Quiz" }, questions);
}

export async function recordAttempt(quizId: number, answers: AttemptAnswer[]) {
  await insertAttempt(quizId, answers);
}

export async function deleteQuiz(id: number) {
  await deleteQuizRows(id);
}
