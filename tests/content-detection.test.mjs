import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHTML } from "linkedom";
import "./support/desktop.mjs";

globalThis.Node ??= parseHTML("<html></html>").Node;

const { detectContent, readDate, summaryHtml } = await import("../src/features/courses/lib/content-detection.ts");
const { sanitizeChildren } = await import("../src/features/courses/lib/import-sanitize.ts");

const today = new Date(2026, 9, 5);
const page = (body) => `<html><body>${body}</body></html>`;
const detect = (title, body, url) => detectContent(title, page(body), { url, today });

test("a title that names its kind settles it", () => {
  assert.equal(detect("Assessment 1 Brief", "<p>Read this.</p>").kind, "assignment");
  assert.equal(detect("Discussion 2: Ethics", "<p>Post here.</p>").kind, "discussion");
  assert.equal(detect("Quiz 3", "<p>Ten questions.</p>").kind, "quiz");
  assert.equal(detect("Module 4 overview", "<p>This week.</p>").kind, "module");
});

test("without a telling title, the headings and text decide, or it says it isn't sure", () => {
  const lecture = detect("Week 3", "<h2>Lecture slides</h2><p>Watch the recording before class.</p>");
  assert.deepEqual([lecture.kind, lecture.sure], ["lecture", true]);
  const brief = detect("Industry challenge", "<h2>Submission</h2><p>Marked against the rubric.</p>");
  assert.equal(brief.kind, "assignment");
  const overview = detect(
    "Programming basics",
    "<h2>Week 1: Variables</h2><p>a</p><h2>Week 2: Loops</h2><p>b</p><h2>Week 3: Functions</h2><p>c</p>"
  );
  assert.equal(overview.kind, "module");
  const unsure = detect("Cyber threats", "<p>Attackers fall into a number of categories.</p>");
  assert.deepEqual([unsure.kind, unsure.sure], ["lesson", false]);
});

test("numbered and named activities are found", () => {
  const { activities } = detect(
    "Week 2",
    "<h3>Activity 2.1: Warm-up</h3><p>Task 3b: Sort the list</p><h3>Quiz 1</h3><p>Task the team with a plan.</p>"
  );
  assert.deepEqual(activities, ["Activity 2.1: Warm-up", "Task 3b: Sort the list", "Quiz 1"]);
});

test("due lines are listed, with their date read when they give one", () => {
  const { dueDates } = detect(
    "Assessment 1 Brief",
    `<p>Due: 12 October 2026</p><ul><li>Draft due Oct 20</li><li>Late because it was due to rain.</li></ul>
     <table><tr><td>Due by 11:55pm AEST Sunday end of Module 4 (Week 4)</td></tr></table><p>Deadline 3/11/2026</p>`
  );
  assert.deepEqual(dueDates, [
    { text: "Due: 12 October 2026", date: "2026-10-12" },
    { text: "Draft due Oct 20", date: "2026-10-20" },
    { text: "Due by 11:55pm AEST Sunday end of Module 4 (Week 4)", date: undefined },
    { text: "Deadline 3/11/2026", date: "2026-11-03" }
  ]);
});

test("a date without a year is the next one to come", () => {
  assert.equal(readDate("due 1 March", today), "2027-03-01");
  assert.equal(readDate("due 2026-02-30", today), undefined);
});

test("links to documents and LMS downloads are files; other links aren't", () => {
  const { files } = detect(
    "Week 2",
    `<a href="https://school.edu/slides/week2.pptx">Week 2 slides</a>
     <a href="https://canvas.school.edu/courses/1/files/77/download">Reading pack</a>
     <a href="https://moodle.school.edu/pluginfile.php/9/mod_resource/content/1/brief%20v2.pdf"></a>
     <a href="https://school.edu/courses/1/pages/intro">Intro</a>`
  );
  assert.deepEqual(files, [
    { name: "Week 2 slides", url: "https://school.edu/slides/week2.pptx" },
    { name: "Reading pack", url: "https://canvas.school.edu/courses/1/files/77/download" },
    { name: "brief v2.pdf", url: "https://moodle.school.edu/pluginfile.php/9/mod_resource/content/1/brief%20v2.pdf" }
  ]);
});

test("the summary lists due dates, then the activities checklist, then files", () => {
  assert.equal(summaryHtml({ dueDates: [], activities: [], files: [] }), "");
  assert.equal(
    summaryHtml({
      dueDates: [{ text: "Due 12 Oct", date: "2026-10-12" }],
      activities: ["Quiz 1"],
      files: [{ name: "Slides & notes", url: "https://a.edu/s.pdf?x=1&y=2" }]
    }),
    '<h2>Due dates</h2><ul><li><p>Due 12 Oct</p></li></ul>' +
      '<h2>Activities</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Quiz 1</p></li></ul>' +
      '<h2>Files</h2><ul><li><p><a href="https://a.edu/s.pdf?x=1&amp;y=2">Slides &amp; notes</a></p></li></ul>'
  );
});

test("bold-only and Week lines become headings when imported; sentences and list items don't", () => {
  const document = new DOMParser().parseFromString(
    page(`<p><strong>Learning outcomes</strong></p><p>Week 3: Sorting</p><p><b>Note.</b> Read first.</p>
     <p>Week 3 we sort lists.</p><ul><li><p><strong>Bold item</strong></p></li></ul>`),
    "text/html"
  );
  assert.equal(
    sanitizeChildren(document.body).replace(/\s+</g, "<"),
    "<h3><strong>Learning outcomes</strong></h3><h3>Week 3: Sorting</h3><p><b>Note.</b> Read first.</p>" +
      "<p>Week 3 we sort lists.</p><ul><li><p><strong>Bold item</strong></p></li></ul>"
  );
});

test("a table cell with two labelled deadlines lists each one with its label", () => {
  const { dueDates } = detect(
    "Assessment 1 Brief",
    "<table><tr><td>Submission</td><td>12-week duration:<br>Due by 11:55pm Sunday end of Module 4 (Week 4)<br>6-week duration:<br>Due by 11:55pm Sunday end of Module 4 (Week 2)</td></tr></table>"
  );
  assert.deepEqual(
    dueDates.map(({ text }) => text),
    [
      "12-week duration: Due by 11:55pm Sunday end of Module 4 (Week 4)",
      "6-week duration: Due by 11:55pm Sunday end of Module 4 (Week 2)"
    ]
  );
});

test("Moodle and Canvas activities and files are read from their links", () => {
  const { activities, files } = detect(
    "Course: Psychology in Cinema",
    `<a href="https://school.moodledemo.net/mod/quiz/view.php?id=723">Factual recall test <span>Quiz</span></a>
     <a href="https://school.moodledemo.net/mod/assign/view.php?id=715">Group Project Assignment</a>
     <a href="https://school.moodledemo.net/mod/forum/view.php?id=704">Announcements from your tutor Forum</a>
     <a href="https://school.moodledemo.net/mod/forum/view.php?id=705">Film club Forum</a>
     <a href="https://school.moodledemo.net/mod/resource/view.php?id=710">Osborne: Transference File</a>
     <a href="https://canvas.school.edu/courses/3/assignments/41">Assignment 2: Essay</a>`
  );
  assert.deepEqual(activities, [
    "Assignment 2: Essay",
    "Quiz: Factual recall test",
    "Assignment: Group Project",
    "Discussion: Film club"
  ]);
  assert.deepEqual(files, [
    { name: "Osborne: Transference", url: "https://school.moodledemo.net/mod/resource/view.php?id=710" }
  ]);
});

test("links back to the page itself aren't activities", () => {
  const url = "https://school.moodledemo.net/mod/assign/view.php?id=715";
  const { activities } = detect("Group Project", `<a href="${url}#section-1">Collapse Expand</a>`, url);
  assert.deepEqual(activities, []);
});

test("the page's own address tells its kind before the title does", () => {
  assert.equal(detect("Group Project", "<p>Make a film.</p>", "https://school.moodledemo.net/mod/assign/view.php?id=715").kind, "assignment");
  assert.equal(detect("Psychology in Cinema", "<p>Welcome.</p>", "https://school.moodledemo.net/course/view.php?id=62").kind, "module");
  assert.equal(detect("Week 2 quiz", "<p>Ten questions.</p>", "https://canvas.school.edu/courses/3/quizzes/9").kind, "quiz");
});
