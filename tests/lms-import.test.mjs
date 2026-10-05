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

test("readSchoolPage puts each readable frame where its iframe was, with the frame's links made absolute", async () => {
  const { readSchoolPage } = await import("../src/features/courses/lib/school-browser.ts");
  globalThis.chainDesktop = {
    browser: {
      read: async () => ({
        url: "https://canvas.school.edu/courses/1/modules/2",
        title: "Week 3",
        html: `<html><head><title></title></head><body><main><h1>Week 3</h1>
          <iframe src="/lesson/7"></iframe></main></body></html>`,
        frames: [
          { url: "https://canvas.school.edu/lesson/7", html: `<html><body><h2>Sorting</h2><img src="img/sort.png"></body></html>` },
          { url: "https://canvas.school.edu/extra", html: `<html><body><p>Further reading</p></body></html>` }
        ],
        unreadableFrames: ["https://video.example.com/embed/1"]
      })
    }
  };
  const page = await readSchoolPage();
  const document = new DOMParser().parseFromString(page.html, "text/html");
  assert.equal(page.url, "https://canvas.school.edu/courses/1/modules/2");
  assert.equal(document.title, "Week 3");
  assert.equal(document.querySelector("iframe"), null);
  assert.deepEqual(
    Array.from(document.querySelector("main").children, (element) => element.tagName.toLowerCase()),
    ["h1", "div", "div"]
  );
  assert.equal(document.querySelector("main h2").textContent, "Sorting");
  assert.equal(document.querySelector("img").getAttribute("src"), "https://canvas.school.edu/lesson/img/sort.png");
  assert.equal(document.querySelector("main").lastElementChild.textContent, "Further reading");
});

test("parseLmsPage drops the site's name from the title and keeps Moodle's header dates", async () => {
  const { parseHTML } = await import("linkedom");
  globalThis.Node ??= parseHTML("<html></html>").Node;
  const { parseLmsPage } = await import("../src/features/courses/lib/lms-import.ts");
  const parsed = parseLmsPage(
    `<html><head><title>Psych Cine: Group Project | Mount Orange</title></head><body>
      <header><div data-region="activity-dates"><div class="date-item"><span>Opened:</span> Saturday, 22 July 2017</div>
      <div class="date-item"><span>Due:</span> Tuesday, 14 December 2021, 12:00 AM</div></div></header>
      <div role="main"><p>Make a short film.</p></div></body></html>`,
    "https://school.moodledemo.net/mod/assign/view.php?id=715"
  );
  assert.equal(parsed.title, "Psych Cine: Group Project");
  assert.equal(
    parsed.html,
    "<p>Opened: Saturday, 22 July 2017</p><p>Due: Tuesday, 14 December 2021, 12:00 AM</p><p>Make a short film.</p>"
  );
});
