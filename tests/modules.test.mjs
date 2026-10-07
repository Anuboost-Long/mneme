import assert from "node:assert/strict";
import { test } from "node:test";

import { useTestDesktop } from "./support/desktop.mjs";

const { database, calls } = useTestDesktop();
const { initDb } = await import("../src/shared/lib/db/index.ts");
const { createCourse } = await import("../src/features/courses/lib/course/actions.ts");
const { ModuleStatus } = await import("../src/features/courses/lib/module/types.ts");
const { createModule, getModules, getModule, updateModule, deleteModule, reorderModules } =
  await import("../src/features/courses/lib/module/actions.ts");
await initDb();

async function course() {
  return createCourse({ name: "Programming Fundamentals" });
}

test("module lifecycle uses SQLite IDs, stable creation order, partial edits and default status", async () => {
  const { id: courseId } = await course();
  await assert.rejects(createModule(courseId, { name: "  " }), /module name/);
  const first = await createModule(courseId, {
    name: "  Module 1  ",
    description: " Introduction "
  });
  const second = await createModule(courseId, {
    name: "Module 2",
    status: ModuleStatus.InProgress
  });
  assert.equal(first.name, "Module 1");
  assert.equal(first.description, "Introduction");
  assert.equal(first.status, ModuleStatus.NotStarted);
  assert.equal(second.status, ModuleStatus.InProgress);
  assert.deepEqual(
    (await getModules(courseId)).map((module) => module.id),
    [first.id, second.id]
  );
  database.prepare("UPDATE module SET updated_at = '2000-01-01' WHERE id = ?").run(first.id);
  const edited = await updateModule(first.id, {
    name: "Introduction to programming",
    status: ModuleStatus.Completed
  });
  assert.equal(edited.description, "Introduction");
  assert.equal(edited.status, ModuleStatus.Completed);
  assert.notEqual(edited.updated_at, "2000-01-01");
  await assert.rejects(updateModule(first.id, { name: " " }), /module name/);
  await updateModule(first.id, { description: "" });
  assert.equal((await getModule(first.id)).description, null);
  await deleteModule(first.id);
  assert.equal(await getModule(first.id), undefined);
  assert.equal((await getModules(courseId)).length, 1);
  await assert.rejects(updateModule(first.id, { name: "Missing" }), /no longer exists/);
  await deleteModule(second.id);
});

test("modules only list under their own course", async () => {
  const courseA = await course();
  const courseB = await createCourse({ name: "Linear Algebra" });
  const moduleA = await createModule(courseA.id, { name: "Loops" });
  const moduleB = await createModule(courseB.id, { name: "Vectors" });
  assert.deepEqual(
    (await getModules(courseA.id)).map((module) => module.id),
    [moduleA.id]
  );
  assert.deepEqual(
    (await getModules(courseB.id)).map((module) => module.id),
    [moduleB.id]
  );
  await deleteModule(moduleA.id);
  await deleteModule(moduleB.id);
});

test("deleting a course deletes its modules", async () => {
  const { deleteCourse } = await import("../src/features/courses/lib/course/actions.ts");
  const { id: courseId } = await course();
  const module = await createModule(courseId, { name: "Revision" });
  await deleteCourse(courseId);
  assert.equal(await getModule(module.id), undefined);
});

test("a new module defaults to 0% progress and unbookmarked, and both are filterable", async () => {
  const { id: courseId } = await course();
  const plain = await createModule(courseId, { name: "Loops" });
  assert.equal(plain.progress, 0);
  assert.equal(plain.bookmarked, false);

  const starred = await createModule(courseId, {
    name: "Recursion",
    progress: 250,
    bookmarked: true
  });
  assert.equal(starred.progress, 100, "progress is clamped to 100");
  assert.equal(starred.bookmarked, true);

  assert.deepEqual(
    (await getModules(courseId, { bookmarked: true })).map((m) => m.id),
    [starred.id]
  );

  await deleteModule(plain.id);
  await deleteModule(starred.id);
});

test("reordering modules saves the new order in one call and leaves others alone", async () => {
  const { id: courseId } = await course();
  const [a, b, c] = [
    await createModule(courseId, { name: "A" }),
    await createModule(courseId, { name: "B" }),
    await createModule(courseId, { name: "C" })
  ];
  const other = await createModule((await course()).id, { name: "Elsewhere" });
  const before = calls.length;
  await reorderModules([c.id, a.id, b.id]);
  assert.equal(calls.length - before, 1);
  assert.deepEqual(
    (await getModules(courseId)).map((module) => [module.name, module.position]),
    [
      ["C", 1],
      ["A", 2],
      ["B", 3]
    ]
  );
  assert.equal((await getModule(other.id)).position, other.position);
  await reorderModules([]);
});
