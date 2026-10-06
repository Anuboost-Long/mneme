import assert from "node:assert/strict";
import { test } from "node:test";

import { DOMParser as LinkedomParser } from "linkedom";

import { useTestDesktop } from "./support/desktop.mjs";

useTestDesktop();
// linkedom leaves the body empty for a bare fragment, which a browser wraps in <html><body>.
globalThis.DOMParser = class {
  parseFromString(html, type) {
    return new LinkedomParser().parseFromString(
      `<!doctype html><html><body>${html}</body></html>`,
      type
    );
  }
};
const { initDb } = await import("../src/shared/lib/db/index.ts");
const { createCourse } = await import("../src/features/courses/lib/course/actions.ts");
const { createModule } = await import("../src/features/courses/lib/module/actions.ts");
const { createPage } = await import("../src/features/courses/lib/page/actions.ts");
const { PageType } = await import("../src/features/courses/lib/page/types.ts");
const { addTasks, getTasks } = await import("../src/features/tasks/lib/task/actions.ts");
const { TaskType } = await import("../src/features/tasks/lib/task/types.ts");
const {
  addFoundTasks,
  findModuleTasks,
  newCandidates,
  pageCandidates,
  parseAiTasks,
  withoutRenamedPageTasks
} = await import("../src/features/tasks/lib/findTasks.ts");
await initDb();

const today = new Date("2026-10-06T09:00:00");

test("a page that is work becomes a task due on its earliest date", () => {
  const [candidate] = pageCandidates(
    {
      id: 1,
      title: "Assignment 1: Risk report",
      type: PageType.Assignment,
      content: "<p>Due: 20 October 2026</p><p>Final due 30 October 2026</p>"
    },
    today
  );
  assert.equal(candidate.title, "Assignment 1: Risk report");
  assert.equal(candidate.type, TaskType.Assignment);
  assert.equal(candidate.due_on, "2026-10-20");
  assert.deepEqual(candidate.page, { id: 1, title: "Assignment 1: Risk report" });
});

test("activities named in a lesson become tasks, dated when a due line names them", () => {
  const candidates = pageCandidates(
    {
      id: 2,
      title: "Week 3",
      type: PageType.Lesson,
      content:
        "<h3>Discussion 1: Threat actors</h3><h3>Quiz 2</h3><p>Discussion 1 is due 15 October 2026.</p>"
    },
    today
  );
  assert.deepEqual(
    candidates.map(({ title, type, due_on }) => [title, type, due_on]),
    [
      ["Discussion 1: Threat actors", TaskType.Discussion, "2026-10-15"],
      ["Quiz 2", TaskType.Quiz, null]
    ]
  );
});

test("bare headings, address-only links and the page's own activity aren't offered", () => {
  const candidates = pageCandidates(
    {
      id: 4,
      title: "Activity 1",
      type: PageType.Exercise,
      content:
        '<h2>EXERCISES</h2><h3>Activity 1 — The Method Hunt</h3><a href="https://lms.example.edu/courses/1/discussion_topics/2">https://lms.example.edu/courses/1/discussion_topics/2</a>'
    },
    today
  );
  assert.deepEqual(
    candidates.map((item) => item.title),
    ["Activity 1"]
  );
});

test("a plain lesson offers nothing", () => {
  assert.deepEqual(
    pageCandidates(
      {
        id: 3,
        title: "Overview",
        type: PageType.Lesson,
        content: "<p>Risk is likelihood times impact.</p>"
      },
      today
    ),
    []
  );
});

test("titles already taken or repeated are offered once", () => {
  const page = { id: 1, title: "P" };
  const candidates = [
    { title: "Quiz 1", type: TaskType.Quiz, due_on: null, page, byAi: false },
    { title: "quiz  1", type: TaskType.Quiz, due_on: null, page, byAi: false },
    { title: "Discussion 2", type: TaskType.Discussion, due_on: null, page, byAi: false }
  ];
  assert.deepEqual(
    newCandidates(candidates, ["Discussion 2"]).map((item) => item.title),
    ["Quiz 1"]
  );
});

test("the agent's JSON is read leniently and tied to its page", () => {
  const pages = [
    { id: 10, title: "Week 1" },
    { id: 11, title: "Week 2" }
  ];
  const answer =
    'Here you go:\n[{"title":"Lab report","type":"Assignment","page":2,"due":"2026-11-01"},{"title":"Reflect","type":"journal","page":1,"due":"Friday"},{"title":"Ghost","type":"quiz","page":9}]';
  assert.deepEqual(parseAiTasks(answer, pages), [
    {
      title: "Lab report",
      type: TaskType.Assignment,
      due_on: "2026-11-01",
      page: { id: 11, title: "Week 2" },
      byAi: true
    },
    {
      title: "Reflect",
      type: TaskType.Exercise,
      due_on: null,
      page: { id: 10, title: "Week 1" },
      byAi: true
    }
  ]);
  assert.deepEqual(parseAiTasks("No tasks here.", pages), []);
  assert.deepEqual(parseAiTasks("[not json]", pages), []);
});

test("an AI task that renames a page which is itself that task is dropped", () => {
  const page = { id: 5, title: "Discussion 1" };
  const known = [
    { title: "Discussion 1", type: TaskType.Discussion, due_on: null, page, byAi: false }
  ];
  const found = [
    { title: "Industry challenge post", type: TaskType.Discussion, due_on: null, page, byAi: true },
    { title: "Reply to two classmates", type: TaskType.Exercise, due_on: null, page, byAi: true }
  ];
  assert.deepEqual(
    withoutRenamedPageTasks(found, known).map((item) => item.title),
    ["Reply to two classmates"]
  );
});

test("a module's pages are read, existing tasks skipped, and picked ones added with their page", async () => {
  const course = await createCourse({ name: "Secure by Design" });
  const module = await createModule(course.id, { name: "Module 3" });
  const assignment = await createPage(module.id, {
    title: "Assignment 2",
    type: PageType.Assignment
  });
  await createPage(module.id, {
    title: "Week 3",
    content: "<h3>Discussion 1</h3><h3>Exercise 2</h3>"
  });
  await addTasks([
    {
      title: "Exercise 2",
      type: TaskType.Exercise,
      course_id: course.id,
      module_id: module.id,
      due_on: null
    }
  ]);

  const found = await findModuleTasks(module.id);
  assert.deepEqual(
    found.candidates.map((item) => item.title),
    ["Assignment 2", "Discussion 1"]
  );
  assert.deepEqual(found.existing, ["exercise 2"]);

  await addFoundTasks([found.candidates[0]], course.id, module.id);
  const added = (await getTasks({ courseId: course.id })).find(
    (task) => task.title === "Assignment 2"
  );
  assert.equal(added.page_id, assignment.id);
  assert.equal(added.module_id, module.id);
  assert.deepEqual(
    (await findModuleTasks(module.id)).candidates.map((item) => item.title),
    ["Discussion 1"]
  );
});
