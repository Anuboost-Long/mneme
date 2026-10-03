import assert from "node:assert/strict";
import { test } from "node:test";
import "./support/desktop.mjs";

const { findActivities, activityChecklist } =
  await import("../src/features/courses/lib/import-sanitize.ts");

test("findActivities picks named exercises, discussions and assignments, once each, and skips prose", () => {
  const html = `<h2>Week 3: Sorting</h2><p>Exercise caution when sorting.</p>
    <h3>Exercise 1: Bubble sort</h3><p>Sort the list.</p>
    <ul><li><a href="https://school.edu/d/1">Discussion 1: When is O(n²) fine?</a></li>
    <li>Assignment 2 — due Friday</li><li>Activities are optional this week</li></ul>
    <p><strong>Quiz</strong></p><h3>Exercise 1: Bubble sort</h3><p>Lab 3.2</p><h2>Further reading</h2>`;
  assert.deepEqual(findActivities(html), [
    "Exercise 1: Bubble sort",
    "Discussion 1: When is O(n²) fine?",
    "Assignment 2 — due Friday",
    "Quiz",
    "Lab 3.2"
  ]);
  assert.deepEqual(findActivities("<p>Read chapter 4.</p>"), []);
});

test("activityChecklist writes an unticked task list the editor reads, with names escaped", () => {
  assert.equal(activityChecklist([]), "");
  assert.equal(
    activityChecklist(["Quiz <1> & 2"]),
    '<h2>Activities</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Quiz &lt;1&gt; &amp; 2</p></li></ul>'
  );
});
