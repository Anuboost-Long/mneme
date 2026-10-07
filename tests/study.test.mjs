import assert from "node:assert/strict";
import { test } from "node:test";

import { useTestDesktop } from "./support/desktop.mjs";

const { database } = useTestDesktop();
const { initDb } = await import("../src/shared/lib/db/index.ts");
const { createCourse } = await import("../src/features/courses/lib/course/actions.ts");
const { createModule, deleteModule } =
  await import("../src/features/courses/lib/module/actions.ts");
const { createPage } = await import("../src/features/courses/lib/page/actions.ts");
const { backupArchive, createBackup, readBackupFile, restoreBackup } =
  await import("../src/features/courses/lib/backup/actions.ts");
const { getDeckCards } = await import("../src/features/flashcards/lib/card/actions.ts");
const { deleteQuiz, getModuleQuizzes, getQuestions } =
  await import("../src/features/quizzes/lib/quiz/actions.ts");
const { QuestionKind } = await import("../src/features/quizzes/lib/quiz/types.ts");
const {
  createSession,
  deleteOrphanSessions,
  deleteSession,
  getModuleSessions,
  getSession,
  saveResults
} = await import("../src/features/study/lib/session/actions.ts");
const { sessionResults, weakTopics } = await import("../src/features/study/lib/session/types.ts");
const { parseSession } = await import("../src/features/study/lib/generate.ts");
await initDb();

const noShuffle = () => 0.999;

async function moduleWithPages() {
  const course = await createCourse({ name: "Secure by Design" });
  const module = await createModule(course.id, { name: "Module 4" });
  const risk = await createPage(module.id, {
    title: "Risk analysis",
    content: "<p>Risk is likelihood times impact.</p>"
  });
  const threats = await createPage(module.id, {
    title: "Threat modelling",
    content: "<p>STRIDE names six threats.</p>"
  });
  return { course, module, risk, threats };
}

const topics = (riskId, threatsId) => [
  { name: "Risk", summary: "Likelihood times impact.", pageIds: [riskId] },
  { name: "Threats", summary: "STRIDE.", pageIds: [threatsId] }
];

const questions = (riskId, threatsId) => [
  {
    kind: QuestionKind.TrueFalse,
    prompt: "Risk ignores impact.",
    choices: null,
    answer: "false",
    explanation: null,
    page_id: riskId,
    topic: "Risk"
  },
  {
    kind: QuestionKind.ShortAnswer,
    prompt: "What does STRIDE name?",
    choices: null,
    answer: "Six threats.",
    explanation: null,
    page_id: threatsId,
    topic: "Threats"
  }
];

test("the agent's session is read: topics keep known pages, questions match topics, broken items are dropped", () => {
  const reply = `Here you go:\n${JSON.stringify({
    overview: "  Module 4 covers risk.  ",
    topics: [
      { name: "Risk", summary: "Likelihood times impact.", page_ids: [7, 99] },
      { name: "", summary: "No name" },
      { name: "Threats", summary: "STRIDE." }
    ],
    questions: [
      {
        type: "true_false",
        question: "Risk ignores impact.",
        answer: false,
        topic: "risk",
        page_id: 7
      },
      { type: "short_answer", question: "Name STRIDE.", answer: "Six threats.", topic: "Unknown" },
      { type: "essay", question: "Dropped", answer: "x", topic: "Risk" }
    ],
    flashcards: [
      { front: "Risk?", back: "Likelihood × impact", page_id: 7 },
      { front: "", back: "No front" }
    ]
  })}`;
  const session = parseSession(reply, new Set([7]), noShuffle);
  assert.equal(session.overview, "Module 4 covers risk.");
  assert.deepEqual(session.topics, [
    { name: "Risk", summary: "Likelihood times impact.", pageIds: [7] },
    { name: "Threats", summary: "STRIDE.", pageIds: [] }
  ]);
  assert.deepEqual(
    session.questions.map((question) => [question.prompt, question.topic]),
    [
      ["Risk ignores impact.", "Risk"],
      ["Name STRIDE.", null]
    ]
  );
  assert.deepEqual(session.cards, [{ front: "Risk?", back: "Likelihood × impact", page_id: 7 }]);
  assert.throws(() => parseSession("No session", new Set()), /didn’t return a study session/);
});

test("topic results combine quiz answers with each card's first grade; weak topics are under 70%, worst first", () => {
  const sessionTopics = [...topics(1, 2), { name: "Untested", summary: "-", pageIds: [] }];
  const asked = [
    { id: 10, topic: "Risk" },
    { id: 11, topic: "Risk" },
    { id: 12, topic: "Threats" }
  ];
  const answers = [
    { questionId: 10, correct: true },
    { questionId: 11, correct: false },
    { questionId: 12, correct: true }
  ];
  const cards = [
    { cardId: 1, pageId: 1, right: false },
    { cardId: 2, pageId: 2, right: true },
    { cardId: 1, pageId: 1, right: true }
  ];
  const results = sessionResults(sessionTopics, asked, answers, cards);
  assert.deepEqual(results, {
    topics: [
      { topic: "Risk", right: 1, total: 3 },
      { topic: "Threats", right: 2, total: 2 },
      { topic: "Untested", right: 0, total: 0 }
    ],
    quizRight: 2,
    quizTotal: 3,
    cardsRight: 1,
    cardsWrong: 1
  });
  assert.deepEqual(
    weakTopics(results.topics).map((result) => result.topic),
    ["Risk"]
  );
  assert.equal(sessionResults(sessionTopics, asked, null, []).quizTotal, null);
});

test("a session saves its quiz with topics, adds cards to the deck, and records results", async () => {
  const { module, risk, threats } = await moduleWithPages();
  const id = await createSession(
    module,
    "Overview",
    topics(risk.id, threats.id),
    questions(risk.id, threats.id),
    [{ front: "Risk?", back: "Likelihood × impact", page_id: risk.id }]
  );
  const session = await getSession(id);
  assert.deepEqual(session.topics, topics(risk.id, threats.id));
  assert.equal(session.results, null);
  assert.deepEqual(
    (await getQuestions(session.quiz_id)).map((question) => question.topic),
    ["Risk", "Threats"]
  );
  assert.equal((await getModuleQuizzes(module.id))[0].title, "Study session: Module 4");
  assert.equal((await getDeckCards(module.id)).length, 1);

  const results = {
    topics: [{ topic: "Risk", right: 0, total: 1 }],
    quizRight: 1,
    quizTotal: 2,
    cardsRight: 3,
    cardsWrong: 1
  };
  await saveResults(id, results);
  const [listed] = await getModuleSessions(module.id);
  assert.deepEqual(listed.results, results.topics);
  assert.deepEqual(
    [listed.quiz_right, listed.quiz_total, listed.cards_right, listed.cards_wrong],
    [1, 2, 3, 1]
  );
  assert.ok(listed.finished_at);

  await deleteQuiz(session.quiz_id);
  assert.equal((await getSession(id)).quiz_id, null);
  await assert.rejects(
    createSession(module, "Overview", [], questions(risk.id, threats.id), []),
    /didn’t find any topics/
  );
});

test("deleting a session keeps its quiz; a deleted module hides its sessions and removes them for good", async () => {
  const { module, risk, threats } = await moduleWithPages();
  const id = await createSession(
    module,
    "Overview",
    topics(risk.id, threats.id),
    questions(risk.id, threats.id),
    []
  );
  await deleteSession(id);
  assert.equal(await getSession(id), null);
  assert.equal((await getModuleQuizzes(module.id)).length, 1);

  const kept = await createSession(
    module,
    "Overview",
    topics(risk.id, threats.id),
    questions(risk.id, threats.id),
    []
  );
  await deleteModule(module.id);
  assert.deepEqual(await getModuleSessions(module.id), []);
  database.prepare("DELETE FROM module WHERE id = ?").run(module.id);
  await deleteOrphanSessions();
  assert.equal(
    database.prepare("SELECT COUNT(*) AS n FROM study_session WHERE id = ?").get(kept).n,
    0
  );
});

test("study sessions and question topics survive a backup and restore", async () => {
  const { module, risk, threats } = await moduleWithPages();
  const id = await createSession(
    module,
    "Backed up",
    topics(risk.id, threats.id),
    questions(risk.id, threats.id),
    []
  );
  await saveResults(id, {
    topics: [{ topic: "Risk", right: 1, total: 1 }],
    quizRight: 1,
    quizTotal: 2,
    cardsRight: 0,
    cardsWrong: 0
  });
  const backup = await readBackupFile(
    new File([await backupArchive(await createBackup())], "b.zip")
  );
  database.exec(
    "DELETE FROM study_session; DELETE FROM quiz_attempt; DELETE FROM quiz_question; DELETE FROM quiz;"
  );
  await restoreBackup(backup);
  const session = await getSession(id);
  assert.equal(session.overview, "Backed up");
  assert.deepEqual(session.results, [{ topic: "Risk", right: 1, total: 1 }]);
  assert.deepEqual(
    (await getQuestions(session.quiz_id)).map((question) => question.topic),
    ["Risk", "Threats"]
  );
});
