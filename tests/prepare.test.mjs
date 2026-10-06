import assert from "node:assert/strict";
import { test } from "node:test";

import { useTestDesktop } from "./support/desktop.mjs";

const { database } = useTestDesktop();
const { initDb } = await import("../src/shared/lib/db/index.ts");
const { createCourse } = await import("../src/features/courses/lib/course/actions.ts");
const { createModule, deleteModule } =
  await import("../src/features/courses/lib/module/actions.ts");
const { createPage, getPages } = await import("../src/features/courses/lib/page/actions.ts");
const { PageType } = await import("../src/features/courses/lib/page/types.ts");
const { backupArchive, createBackup, readBackupFile, restoreBackup } =
  await import("../src/features/courses/lib/backup/actions.ts");
const { getQuiz, getQuestions } = await import("../src/features/quizzes/lib/quiz/actions.ts");
const { QuestionKind } = await import("../src/features/quizzes/lib/quiz/types.ts");
const prep = await import("../src/features/prepare/lib/prep/actions.ts");
const { notesHtml, summaryHtml } = await import("../src/features/prepare/lib/prep/types.ts");
const { pagesToCondense, parsePrep } = await import("../src/features/prepare/lib/generate.ts");
const { fingerprint, htmlText } = await import("../src/features/prepare/lib/material.ts");
const { estimateRuns, pagesNeedingCards } =
  await import("../src/features/prepare/lib/prepareJob.ts");
await initDb();

const noShuffle = () => 0.999;

async function moduleWithPages() {
  const course = await createCourse({ name: "Secure by Design" });
  const module = await createModule(course.id, { name: "Module 4" });
  const risk = await createPage(module.id, {
    title: "Risk analysis",
    content:
      "<p>Risk is likelihood times impact, and it drives every control decision a security team makes.</p>"
  });
  const threats = await createPage(module.id, {
    title: "Threat modelling",
    type: PageType.Discussion,
    content: "<p>STRIDE names six threats.</p>"
  });
  return { course, module, risk, threats };
}

const question = (topic) => ({
  kind: QuestionKind.TrueFalse,
  prompt: "Risk ignores impact.",
  choices: null,
  answer: "false",
  explanation: null,
  page_id: null,
  topic
});

test("the agent's preparation is read: topics keep terms and points, questions match topics", () => {
  const reply = `Here:\n${JSON.stringify({
    overview: "Module 4 is about risk.",
    topics: [
      {
        name: "Risk",
        summary: "Likelihood × impact.",
        page_ids: [7, 99],
        terms: [
          { term: "Risk", definition: "Likelihood × impact" },
          { term: "", definition: "x" }
        ],
        points: ["Measure it", 3, ""]
      },
      { name: "", summary: "Dropped" }
    ],
    questions: [
      { type: "true_false", question: "Risk ignores impact.", answer: false, topic: "RISK" },
      { type: "essay", question: "Dropped", answer: "x" }
    ]
  })}`;
  const draft = parsePrep(reply, new Set([7]), noShuffle);
  assert.equal(draft.overview, "Module 4 is about risk.");
  assert.deepEqual(draft.topics, [
    {
      name: "Risk",
      summary: "Likelihood × impact.",
      pageIds: [7],
      terms: [{ term: "Risk", definition: "Likelihood × impact" }],
      points: ["Measure it"]
    }
  ]);
  assert.deepEqual(
    draft.questions.map((item) => [item.prompt, item.topic]),
    [["Risk ignores impact.", "Risk"]]
  );
  assert.throws(() => parsePrep("{}", new Set()), /didn’t write the module’s summary/);
  assert.throws(() => parsePrep("no json", new Set()), /didn’t return/);
});

test("material past the budget condenses only the pages longer than their share", () => {
  const pages = [
    { id: 1, text: "a".repeat(50_000) },
    { id: 2, text: "b".repeat(15_000) },
    { id: 3, text: "c".repeat(1_000) }
  ];
  assert.deepEqual(pagesToCondense(pages), { ids: [1], share: 20_000 });
  assert.deepEqual(pagesToCondense(pages.slice(1)).ids, []);
  assert.equal(
    pagesToCondense(Array.from({ length: 100 }, (_, id) => ({ id, text: "x".repeat(2_500) })))
      .share,
    2_000
  );
});

test("page text keeps its lines, and the fingerprint follows the text", () => {
  assert.equal(
    htmlText("<h2>Risk</h2><p>Likelihood   ×\nimpact</p><ul><li>One</li><li>Two</li></ul>"),
    "Risk\nLikelihood × impact\nOne\nTwo"
  );
  assert.equal(fingerprint("abc"), fingerprint("abc"));
  assert.notEqual(fingerprint("abc"), fingerprint("abd"));
});

test("summary and notes pages are built from the topics, with text escaped", () => {
  const topics = [
    {
      name: "Risk <1>",
      summary: "Likelihood & impact.",
      pageIds: [5, 6],
      terms: [{ term: "Exposure", definition: "What's at stake" }],
      points: ["Measure it"]
    }
  ];
  assert.equal(
    summaryHtml("First.\n\nSecond.", topics),
    "<p>First.</p><p>Second.</p><h2>Key topics</h2><ul><li><strong>Risk &lt;1&gt;</strong>: Likelihood &amp; impact.</li></ul>"
  );
  assert.equal(
    notesHtml(topics, new Map([[5, "Risk analysis"]])),
    "<h2>Risk &lt;1&gt;</h2><p>Likelihood &amp; impact.</p><h3>Key terms</h3><ul><li><strong>Exposure</strong>: What's at stake</li></ul><h3>Key points</h3><ul><li>Measure it</li></ul><p><em>From Risk analysis</em></p>"
  );
});

test("agent runs: one for the writing plus one per page that needs cards", async () => {
  const { module, risk, threats } = await moduleWithPages();
  const pages = await getPages(module.id);
  const needing = pagesNeedingCards(pages, new Set([threats.id]));
  assert.deepEqual(
    needing.map((page) => page.id),
    [risk.id]
  );
  assert.equal(estimateRuns(pages, ["summary", "quiz", "flashcards"], 1), 2);
  assert.equal(estimateRuns(pages, ["flashcards"], 3), 3);
});

test("summary and notes pages sit at the top, and preparing again updates them in place", async () => {
  const { module, risk, threats } = await moduleWithPages();
  await prep.saveTopics(module.id, [
    { name: "Risk", summary: "Likelihood × impact.", pageIds: [risk.id] }
  ]);
  await prep.saveRevisionNotes(module, "<p>Notes v1</p>");
  await prep.saveSummary(module, "<p>Summary v1</p>");
  let pages = await getPages(module.id);
  assert.deepEqual(
    pages.map((page) => page.title),
    ["Summary: Module 4", "Revision notes: Module 4", "Risk analysis", "Threat modelling"]
  );
  assert.deepEqual([pages[0].type, pages[1].type], [PageType.Notes, PageType.Revision]);

  await prep.saveSummary(module, "<p>Summary v2</p>");
  pages = await getPages(module.id);
  assert.equal(pages.length, 4);
  assert.match(pages[0].content, /Summary v2/);
  assert.deepEqual(await prep.prepPageIds(module.id), new Set([pages[0].id, pages[1].id]));

  const saved = await prep.getModulePrep(module.id);
  assert.deepEqual(saved.topics, [
    { name: "Risk", summary: "Likelihood × impact.", pageIds: [risk.id] }
  ]);
  assert.equal(saved.prepared_at, null);
  await prep.finishPrep(module.id, [
    `slides.pptx on “${threats.title}”: mneme can’t read this kind of file yet.`
  ]);
  assert.ok((await prep.getModulePrep(module.id)).prepared_at);
  assert.equal((await prep.getModulePrep(module.id)).unread.length, 1);
});

test("a new practice quiz replaces the last one, with its topics", async () => {
  const { module } = await moduleWithPages();
  await prep.savePracticeQuiz(module, [question("Risk")]);
  const first = (await prep.getModulePrep(module.id)).quiz_id;
  await prep.savePracticeQuiz(module, [question("Risk"), question(null)]);
  const second = (await prep.getModulePrep(module.id)).quiz_id;
  assert.notEqual(first, second);
  assert.equal(await getQuiz(first), null);
  assert.equal((await getQuiz(second)).title, "Practice quiz: Module 4");
  assert.deepEqual(
    (await getQuestions(second)).map((item) => item.topic),
    ["Risk", null]
  );
});

test("a condensed page is reused only while its material is unchanged", async () => {
  const { risk } = await moduleWithPages();
  await prep.putDigest(risk.id, "hash-1", "Condensed v1");
  assert.equal(await prep.getDigest(risk.id, "hash-1"), "Condensed v1");
  assert.equal(await prep.getDigest(risk.id, "hash-2"), null);
  await prep.putDigest(risk.id, "hash-2", "Condensed v2");
  assert.equal(await prep.getDigest(risk.id, "hash-1"), null);
  assert.deepEqual(await prep.getFreshDigestPageIds(risk.module_id), new Set([risk.id]));
  database
    .prepare("UPDATE page SET updated_at = datetime('now', '+1 minute') WHERE id = ?")
    .run(risk.id);
  assert.deepEqual(await prep.getFreshDigestPageIds(risk.module_id), new Set());
});

test("a page condensed before isn't counted again in the agent runs", async () => {
  const { module, risk } = await moduleWithPages();
  await createPage(module.id, { title: "Long", content: `<p>${"word ".repeat(13_000)}</p>` });
  const pages = await getPages(module.id);
  const long = pages.find((page) => page.title === "Long");
  assert.equal(estimateRuns(pages, ["summary"], 0), 2);
  assert.equal(estimateRuns(pages, ["summary"], 0, new Set([long.id])), 1);
  assert.equal(estimateRuns(pages, ["summary"], 0, new Set([risk.id])), 2);
});

test("a deleted module hides its preparation, and removing it for good clears it", async () => {
  const { module, risk } = await moduleWithPages();
  await prep.saveTopics(module.id, []);
  await prep.putDigest(risk.id, "h", "d");
  await deleteModule(module.id);
  assert.equal(await prep.getModulePrep(module.id), null);
  database.prepare("DELETE FROM page WHERE module_id = ?").run(module.id);
  database.prepare("DELETE FROM module WHERE id = ?").run(module.id);
  await prep.deleteOrphanPreps();
  assert.equal(
    database.prepare("SELECT COUNT(*) AS n FROM module_prep WHERE module_id = ?").get(module.id).n,
    0
  );
  assert.equal(
    database.prepare("SELECT COUNT(*) AS n FROM page_digest WHERE page_id = ?").get(risk.id).n,
    0
  );
});

test("a module's preparation survives a backup and restore", async () => {
  const { module } = await moduleWithPages();
  await prep.saveSummary(module, "<p>Backed up</p>");
  await prep.finishPrep(module.id, ["one thing"]);
  const before = await prep.getModulePrep(module.id);
  const backup = await readBackupFile(
    new File([await backupArchive(await createBackup())], "b.zip")
  );
  database.exec("DELETE FROM module_prep;");
  await restoreBackup(backup);
  const after = await prep.getModulePrep(module.id);
  assert.deepEqual(
    [after.summary_page_id, after.unread, after.prepared_at],
    [before.summary_page_id, ["one thing"], before.prepared_at]
  );
});
