import assert from "node:assert/strict";
import { test } from "node:test";

import { parseHTML } from "linkedom";

import { useTestDesktop } from "./support/desktop.mjs";

globalThis.Node ??= parseHTML("<html></html>").Node;

const { database } = useTestDesktop();
const { initDb } = await import("../src/shared/lib/db/index.ts");
const { createCourse } = await import("../src/features/courses/lib/course/actions.ts");
const { createModule } = await import("../src/features/courses/lib/module/actions.ts");
const { getPage, getPages } = await import("../src/features/courses/lib/page/actions.ts");
const { PageType } = await import("../src/features/courses/lib/page/types.ts");
const { backupArchive, createBackup, readBackupFile, restoreBackup } =
  await import("../src/features/courses/lib/backup/actions.ts");
const { fileImportKind, parseImportFile, pastedImport } =
  await import("../src/features/courses/lib/file-import.ts");
const { isLmsAddress, readArticle } = await import("../src/features/courses/lib/article-import.ts");
const { detectAll, importFiles, saveImport } =
  await import("../src/features/courses/lib/import-save.ts");
await initDb();

async function freshModule() {
  const course = await createCourse({ name: "Secure by Design" });
  const module = await createModule(course.id, { name: "Module 5" });
  return { course, module };
}

const file = (name, text, type = "text/plain") => new File([Buffer.from(text)], name, { type });

test("every kind of file is recognized by its extension", () => {
  const kinds = [
    "notes.md",
    "brief.docx",
    "book.pdf",
    "notes.txt",
    "slide.PNG",
    "photo.jpeg",
    "talk.m4a",
    "talk.opus",
    "lecture.mp4",
    "lecture.webm",
    "lecture.mkv",
    "deck.pptx"
  ].map((name) => fileImportKind(file(name, "")));
  assert.deepEqual(kinds, [
    "markdown",
    "docx",
    "pdf",
    "text",
    "image",
    "image",
    "audio",
    "audio",
    "video",
    "video",
    "video",
    undefined
  ]);
});

test("a text file becomes paragraphs, with week lines as headings", async () => {
  const parsed = await parseImportFile(
    file("week-3_notes.txt", "Week 3\nRisk is likelihood times impact.\n\nControls reduce it.")
  );
  assert.equal(parsed.title, "week 3 notes");
  assert.match(parsed.html, /<h\d>Week 3<\/h\d>/);
  assert.match(
    parsed.html,
    /<p>Risk is likelihood times impact\.<\/p><p>Controls reduce it\.<\/p>/
  );
});

test("a short line before a sentence in a text file becomes a heading", async () => {
  const parsed = await parseImportFile(
    file("notes.txt", "Introduction\nSupply sets the price.\n\nBring\nA calculator\nNotes")
  );
  assert.match(parsed.html, /<h3>Introduction<\/h3><p>Supply sets the price\.<\/p>/);
  assert.match(parsed.html, /<p>Bring<\/p><p>A calculator<\/p><p>Notes<\/p>/);
});

test("audio and video files become Lecture pages waiting for their media", async () => {
  const audio = await parseImportFile(file("Week 3 lecture.m4a", "x", "audio/mp4"));
  const video = await parseImportFile(file("Week 3 lecture.mov", "x", "video/quicktime"));
  assert.deepEqual(
    [audio.title, audio.type, audio.media.kind, audio.html],
    ["Week 3 lecture", PageType.Lecture, "audio", ""]
  );
  assert.equal(video.media.kind, "video");
  await assert.rejects(parseImportFile(file("deck.pptx", "x")), /Can’t import “deck\.pptx”/);
});

test("pasted text takes its first line as the title; pasted web content is cleaned", () => {
  const text = pastedImport("Defense in depth\nLayer several controls.", "");
  assert.equal(text.title, "Defense in depth");
  assert.match(text.html, /<p>Layer several controls\.<\/p>/);
  const long = pastedImport(`${"word ".repeat(30)}\nmore`, "");
  assert.equal(long.title, "Pasted text");
  const web = pastedImport(
    "Copied",
    '<html><body><p onclick="x()">Copied <b>bold</b></p><script>bad()</script></body></html>'
  );
  assert.doesNotMatch(web.html, /script|onclick/);
  assert.match(web.html, /Copied/);
});

test("school sites aren't read as articles; other articles keep their author and site", () => {
  assert.ok(isLmsAddress("https://school.moodledemo.net/mod/page/view.php?id=4"));
  assert.ok(isLmsAddress("https://canvas.example.edu/courses/12/pages/intro"));
  assert.ok(!isLmsAddress("https://www.example.com/blog/defense-in-depth"));
  const paragraph =
    "Defense in depth layers several security controls so that when one fails, the others still protect the system. ".repeat(
      6
    );
  const html = `<html><head><title>Defense in depth | Example</title><meta property="og:site_name" content="Example Security"></head><body>
    <nav><a href="/">Home</a><a href="/about">About</a></nav>
    <article><h1>Defense in depth</h1><p class="byline">By Ada Lovelace</p>${Array.from({ length: 5 }, () => `<p>${paragraph}</p>`).join("")}<img src="/diagram.png" alt="Layers"></article>
    <footer>Copyright</footer></body></html>`;
  assert.equal(readArticle(html, "https://canvas.example.edu/courses/1"), null);
  const article = readArticle(html, "https://www.example.com/blog/defense-in-depth");
  assert.ok(article, "the article is read");
  assert.match(article.title, /Defense in depth/);
  assert.match(article.html, /^<p><em>[^<]*Example Security/);
  assert.match(article.html, /src="https:\/\/www\.example\.com\/diagram\.png"/);
  assert.doesNotMatch(article.html, /About|Copyright/);
});

test("an import keeps its source, findings and tasks", async () => {
  const { course, module } = await freshModule();
  const { parsed, kind, findings } = detectAll({
    title: "Assessment 1 Brief",
    type: PageType.Lesson,
    html: "<h2>Submission</h2><p>Due: 12 October 2026</p><p>Submit your report. Marking criteria apply.</p>"
  });
  const page = await saveImport({
    courseId: course.id,
    moduleId: module.id,
    parsed,
    findings,
    kind,
    source: "https://example.com/brief"
  });
  const saved = await getPage(page.id);
  assert.equal(saved.source, "https://example.com/brief");
  assert.equal(saved.type, PageType.Assignment);
  assert.match(saved.content, /Due dates/);
  const tasks = database.prepare("SELECT title FROM task WHERE page_id = ?").all(page.id);
  assert.ok(tasks.length >= 1);
});

test("several files import one page each, in order, and a failure doesn't stop the rest", async () => {
  const { course, module } = await freshModule();
  const statuses = [];
  const imported = [];
  await importFiles(
    [file("one.txt", "First file"), file("deck.pptx", "x"), file("two.md", "# Second\n\nText")],
    course.id,
    module.id,
    (index, status) => (statuses[index] = status),
    (page) => imported.push(page.title)
  );
  assert.deepEqual(imported, ["one", "two"]);
  assert.deepEqual(
    statuses.map((status) => status.state),
    ["done", "failed", "done"]
  );
  assert.match(statuses[1].reason, /deck\.pptx/);
  assert.deepEqual(
    (await getPages(module.id)).map((page) => page.source),
    ["one.txt", "two.md"]
  );
});

test("a page's source survives a backup and restore", async () => {
  const { course, module } = await freshModule();
  const page = await saveImport({
    courseId: course.id,
    moduleId: module.id,
    parsed: { title: "Kept source", type: PageType.Reading, html: "<p>Text</p>" },
    findings: { dueDates: [], activities: [], files: [] },
    source: "lecture.m4a"
  });
  const backup = await readBackupFile(
    new File([await backupArchive(await createBackup())], "b.zip")
  );
  database.prepare("DELETE FROM page WHERE id = ?").run(page.id);
  await restoreBackup(backup);
  assert.equal((await getPage(page.id)).source, "lecture.m4a");
});
