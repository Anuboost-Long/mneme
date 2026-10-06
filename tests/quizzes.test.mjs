import assert from "node:assert/strict";
import { test } from "node:test";

import { useTestDesktop } from "./support/desktop.mjs";

const { database } = useTestDesktop();
const { initDb } = await import("../src/shared/lib/db/index.ts");
const { createCourse } = await import("../src/features/courses/lib/course/actions.ts");
const { createModule, deleteModule } = await import("../src/features/courses/lib/module/actions.ts");
const { createPage } = await import("../src/features/courses/lib/page/actions.ts");
const { backupArchive, createBackup, readBackupFile, restoreBackup } =
  await import("../src/features/courses/lib/backup/actions.ts");
const { createQuiz, deleteOrphanQuizzes, deleteQuiz, getModuleQuizzes, getQuestions, getQuiz, recordAttempt } =
  await import("../src/features/quizzes/lib/quiz/actions.ts");
const { QuestionKind, isRight, rightAnswer } = await import("../src/features/quizzes/lib/quiz/types.ts");
const { parseQuestions } = await import("../src/features/quizzes/lib/generate.ts");
await initDb();

const allKinds = [QuestionKind.MultipleChoice, QuestionKind.TrueFalse, QuestionKind.ShortAnswer];
const noShuffle = () => 0.999;

async function moduleWithPage() {
  const course = await createCourse({ name: "Secure by Design" });
  const module = await createModule(course.id, { name: "Module 2" });
  const page = await createPage(module.id, { title: "Risk analysis", content: "<p>Risk is likelihood times impact.</p>" });
  return { course, module, page };
}

const questions = (pageId) => [
  { kind: QuestionKind.MultipleChoice, prompt: "Risk is…", choices: ["Likelihood × impact", "Cost", "Time"], answer: "0", explanation: "The page defines it so.", page_id: pageId },
  { kind: QuestionKind.TrueFalse, prompt: "Risk ignores impact.", choices: null, answer: "false", explanation: null, page_id: pageId },
  { kind: QuestionKind.ShortAnswer, prompt: "Define risk.", choices: null, answer: "Likelihood times impact.", explanation: null, page_id: null }
];

test("the agent's quiz is read by kind, malformed questions are dropped", () => {
  const reply = `Sure:\n${JSON.stringify([
    { type: "multiple_choice", question: "Q1", choices: ["a", "b", "c", "d"], answer: 2, explanation: "Because c.", page_id: 7 },
    { type: "true_false", question: "Q2", answer: true, page_id: 99 },
    { type: "short_answer", question: "Q3", answer: "An answer" },
    { type: "multiple_choice", question: "No right answer", choices: ["a", "b"], answer: 5 },
    { type: "true_false", question: "Not a boolean", answer: "yes" },
    { type: "essay", question: "Unknown kind", answer: "x" },
    { type: "short_answer", question: "", answer: "No question" }
  ])}`;
  const parsed = parseQuestions(reply, allKinds, new Set([7]), noShuffle);
  assert.deepEqual(parsed, [
    { kind: QuestionKind.MultipleChoice, prompt: "Q1", explanation: "Because c.", page_id: 7, choices: ["a", "b", "c", "d"], answer: "2" },
    { kind: QuestionKind.TrueFalse, prompt: "Q2", explanation: null, page_id: null, choices: null, answer: "true" },
    { kind: QuestionKind.ShortAnswer, prompt: "Q3", explanation: null, page_id: null, choices: null, answer: "An answer" }
  ]);
  assert.throws(() => parseQuestions("No quiz today", allKinds, new Set()), /didn’t return a quiz/);
});

test("only the chosen kinds are kept, and shuffled options still point at the right one", () => {
  const reply = JSON.stringify([
    { type: "multiple_choice", question: "Q", choices: ["right", "w1", "w2", "w3"], answer: 0 },
    { type: "true_false", question: "T", answer: false }
  ]);
  const [question, ...rest] = parseQuestions(reply, [QuestionKind.MultipleChoice], new Set(), () => 0);
  assert.equal(rest.length, 0);
  assert.equal(question.choices[Number(question.answer)], "right");
  assert.notEqual(question.choices[0], "right");
});

test("right answers are read out and checked per kind", () => {
  const [choice, truth, short] = questions(null);
  assert.equal(rightAnswer(choice), "Likelihood × impact");
  assert.equal(rightAnswer(truth), "False");
  assert.equal(rightAnswer(short), "Likelihood times impact.");
  assert.ok(isRight(choice, "0"));
  assert.ok(!isRight(choice, "1"));
  assert.ok(isRight(truth, "false"));
  assert.ok(!isRight(short, "Likelihood times impact."));
});

test("a quiz keeps its questions in order, and attempts give last and best scores", async () => {
  const { module, page } = await moduleWithPage();
  const id = await createQuiz(module.id, page.id, "Quiz: Risk analysis", questions(page.id));
  const saved = await getQuestions(id);
  assert.deepEqual(saved.map((question) => question.prompt), ["Risk is…", "Risk ignores impact.", "Define risk."]);
  assert.deepEqual(saved[0].choices, ["Likelihood × impact", "Cost", "Time"]);
  assert.equal(saved[0].page_title, "Risk analysis");

  let [quiz] = await getModuleQuizzes(module.id);
  assert.deepEqual([quiz.page_title, quiz.question_count, quiz.attempt_count, quiz.last_score, quiz.best_score], ["Risk analysis", 3, 0, null, null]);

  await recordAttempt(id, saved.map((question) => ({ questionId: question.id, correct: true })));
  database.prepare("UPDATE quiz_attempt SET created_at = '2026-01-01 00:00:00'").run();
  await recordAttempt(id, saved.map((question, index) => ({ questionId: question.id, correct: index === 0 })));
  [quiz] = await getModuleQuizzes(module.id);
  assert.deepEqual([quiz.attempt_count, quiz.last_score, quiz.best_score], [2, 1, 3]);
});

test("a quiz with no questions isn't saved", async () => {
  const { module } = await moduleWithPage();
  await assert.rejects(createQuiz(module.id, null, "Empty", []), /didn’t write any questions/);
});

test("deleting a quiz removes its questions and attempts; a deleted module hides its quizzes", async () => {
  const { module, page } = await moduleWithPage();
  const id = await createQuiz(module.id, null, "Quiz: Module 2", questions(page.id));
  await recordAttempt(id, [{ questionId: 1, correct: true }]);
  await deleteQuiz(id);
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM quiz_question WHERE quiz_id = ?").get(id).n, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM quiz_attempt WHERE quiz_id = ?").get(id).n, 0);

  const kept = await createQuiz(module.id, null, "Quiz: Module 2", questions(page.id));
  await deleteModule(module.id);
  assert.deepEqual(await getModuleQuizzes(module.id), []);
  assert.equal(await getQuiz(kept), null);
  database.prepare("DELETE FROM module WHERE id = ?").run(module.id);
  await deleteOrphanQuizzes();
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM quiz_question WHERE quiz_id = ?").get(kept).n, 0);
});

test("quizzes, questions and attempts survive a backup and restore", async () => {
  const { module, page } = await moduleWithPage();
  const id = await createQuiz(module.id, page.id, "Quiz: Backed up", questions(page.id));
  await recordAttempt(id, [{ questionId: 1, correct: true }]);
  const backup = await readBackupFile(new File([await backupArchive(await createBackup())], "b.zip"));
  database.exec("DELETE FROM quiz_attempt; DELETE FROM quiz_question; DELETE FROM quiz;");
  await restoreBackup(backup);
  const [quiz] = (await getModuleQuizzes(module.id)).filter((item) => item.title === "Quiz: Backed up");
  assert.deepEqual([quiz.question_count, quiz.attempt_count, quiz.best_score], [3, 1, 1]);
  assert.deepEqual((await getQuestions(id))[0].choices, ["Likelihood × impact", "Cost", "Time"]);
});
