import type { QuizAttemptRow } from "@/shared/lib/db/schema/quiz-attempt";
import type { QuizQuestionRow } from "@/shared/lib/db/schema/quiz-question";
import type { QuizRow } from "@/shared/lib/db/schema/quiz";
import { desktop } from "@chain/sdk";

import type { AttemptAnswer, Question, QuestionDraft, Quiz } from "./types";

const LIVE_QUIZZES = `FROM quiz
  JOIN module ON module.id = quiz.module_id AND module.deleted_at IS NULL
  LEFT JOIN page ON page.id = quiz.page_id AND page.deleted_at IS NULL`;

const QUIZ_COLUMNS = `quiz.*, page.title AS page_title,
  (SELECT COUNT(*) FROM quiz_question WHERE quiz_id = quiz.id) AS question_count,
  (SELECT COUNT(*) FROM quiz_attempt WHERE quiz_id = quiz.id) AS attempt_count,
  (SELECT score FROM quiz_attempt WHERE quiz_id = quiz.id ORDER BY created_at DESC, id DESC LIMIT 1) AS last_score,
  (SELECT MAX(score) FROM quiz_attempt WHERE quiz_id = quiz.id) AS best_score`;

export function getModuleQuizzes(moduleId: number) {
  return desktop.storage.query<Quiz>(
    `SELECT ${QUIZ_COLUMNS} ${LIVE_QUIZZES} WHERE quiz.module_id = ? ORDER BY quiz.created_at DESC, quiz.id DESC`,
    [moduleId]
  );
}

export async function getQuiz(id: number) {
  const [quiz] = await desktop.storage.query<Quiz>(`SELECT ${QUIZ_COLUMNS} ${LIVE_QUIZZES} WHERE quiz.id = ?`, [id]);
  return quiz ?? null;
}

export async function getQuestions(quizId: number): Promise<Question[]> {
  const rows = await desktop.storage.query<QuizQuestionRow & { page_title: string | null }>(
    `SELECT quiz_question.*, page.title AS page_title FROM quiz_question
     LEFT JOIN page ON page.id = quiz_question.page_id AND page.deleted_at IS NULL
     WHERE quiz_question.quiz_id = ? ORDER BY quiz_question.position, quiz_question.id`,
    [quizId]
  );
  return rows.map((row) => ({ ...row, kind: row.kind, choices: row.choices ? (JSON.parse(row.choices) as string[]) : null }));
}

export function insertQuiz(quiz: Pick<QuizRow, "module_id" | "page_id" | "title">, questions: QuestionDraft[]) {
  return desktop.storage.transaction(async (tx) => {
    const { id } = await tx.table<QuizRow>("quiz").insert(quiz);
    const questionTable = tx.table<QuizQuestionRow>("quiz_question");
    for (const [position, question] of questions.entries())
      await questionTable.insert({
        ...question,
        quiz_id: id,
        position,
        choices: question.choices ? JSON.stringify(question.choices) : null
      });
    return id;
  });
}

export async function insertAttempt(quizId: number, answers: AttemptAnswer[]) {
  await desktop.storage.table<QuizAttemptRow>("quiz_attempt").insert({
    quiz_id: quizId,
    score: answers.filter((answer) => answer.correct).length,
    total: answers.length,
    answers: JSON.stringify(answers)
  });
}

export function deleteQuizRows(id: number) {
  return desktop.storage.transaction(async (tx) => {
    await tx.table<QuizQuestionRow>("quiz_question").delete({ quiz_id: id });
    await tx.table<QuizAttemptRow>("quiz_attempt").delete({ quiz_id: id });
    await tx.table<QuizRow>("quiz").delete({ id });
  });
}

export async function deleteOrphanQuizzes() {
  await desktop.storage.execute("DELETE FROM quiz WHERE module_id NOT IN (SELECT id FROM module)");
  await desktop.storage.execute("DELETE FROM quiz_question WHERE quiz_id NOT IN (SELECT id FROM quiz)");
  await desktop.storage.execute("DELETE FROM quiz_attempt WHERE quiz_id NOT IN (SELECT id FROM quiz)");
  await desktop.storage.execute("UPDATE quiz SET page_id = NULL WHERE page_id IS NOT NULL AND page_id NOT IN (SELECT id FROM page)");
  await desktop.storage.execute(
    "UPDATE quiz_question SET page_id = NULL WHERE page_id IS NOT NULL AND page_id NOT IN (SELECT id FROM page)"
  );
}
