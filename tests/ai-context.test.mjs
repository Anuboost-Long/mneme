import assert from "node:assert/strict";
import { test } from "node:test";

import { DOMParser as LinkedomParser } from "linkedom";

import { useTestDesktop } from "./support/desktop.mjs";

useTestDesktop();
// linkedom leaves the body empty for a bare fragment, which a browser wraps in <html><body>.
globalThis.DOMParser = class {
  parseFromString(html, type) {
    return new LinkedomParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, type);
  }
};
const { initDb } = await import("../src/shared/lib/db/index.ts");
const { createCourse } = await import("../src/features/courses/lib/course/actions.ts");
const { createModule } = await import("../src/features/courses/lib/module/actions.ts");
const { createPage, updatePage } = await import("../src/features/courses/lib/page/actions.ts");
const { PageType } = await import("../src/features/courses/lib/page/types.ts");
const { createAttachment } = await import("../src/features/courses/lib/attachment/actions.ts");
const { createRecording, saveTranscript, storeRecordedAudio } =
  await import("../src/features/courses/lib/recording/actions.ts");
const { buildActionContext, buildChatContext, CONTEXT_BUDGET_CHARS } =
  await import("../src/features/ai-context/lib/builder.ts");
await initDb();

async function workspace(transcript = "Mitochondria make energy for the cell.") {
  const course = await createCourse({ name: "Biology", code: "BIO101", instructor: "Dr Lee", description: "Cells and life." });
  const module = await createModule(course.id, { name: "Week 3", description: "Cell structure." });
  const page = await createPage(module.id, { title: "Organelles", type: PageType.Lecture, content: "<p>The nucleus holds DNA.</p>" });
  await createPage(module.id, { title: "Quiz prep", type: PageType.Revision });
  await createAttachment(page.id, new File([Buffer.from("Ribosomes build proteins.")], "notes.txt", { type: "text/plain" }));
  await createAttachment(page.id, new File([Buffer.from("%PDF")], "slides.pdf", { type: "application/pdf" }));
  const recording = await createRecording(page.id, await storeRecordedAudio(new Blob([Buffer.from("a")], { type: "audio/mp4" }), 120000));
  await saveTranscript(recording.id, { segments: [{ startMs: 0, endMs: 1000, text: transcript }] });
  return { course, module, page, recording };
}

const labels = (context) => context.layers.map((layer) => layer.label);

test("chat with tools gets names and ids to read from, not the content", async () => {
  const { page, recording } = await workspace();
  const context = await buildChatContext(page.id, "holds DNA", true, null);
  assert.deepEqual(labels(context), ["Course", "Module", "Page", "Selection", "Attachments", "Transcripts"]);
  assert.match(context.text, /get_page/);
  assert.match(context.text, new RegExp(`<page id="${page.id}"`));
  assert.match(context.text, new RegExp(`<recording id="${recording.id}"`));
  assert.match(context.text, /Quiz prep \(id \d+, Revision, Not started\)/);
  assert.match(context.text, /<selection>\nholds DNA\n<\/selection>/);
  assert.doesNotMatch(context.text, /nucleus|Ribosomes|Mitochondria/);
});

test("chat without tools gets the page, attachment text and transcripts themselves", async () => {
  const { page } = await workspace();
  const context = await buildChatContext(page.id, "", false, null);
  assert.match(context.text, /The nucleus holds DNA/);
  assert.match(context.text, /Ribosomes build proteins/);
  assert.match(context.text, /Mitochondria make energy/);
  assert.doesNotMatch(context.text, /get_page|id="/);
  const attachments = context.layers.find((layer) => layer.label === "Attachments");
  assert.match(attachments.detail, /slides\.pdf, name only/);
});

test("an action on a selection sends the page's details, not its content", async () => {
  const { course, module, page } = await workspace();
  const context = await buildActionContext({ pageId: page.id, moduleId: module.id, courseId: course.id }, "selection", [], true, null);
  assert.match(context.text, /<page title="Organelles" type="Lecture" status="Not started" \/>/);
  assert.match(context.text, /code="BIO101"/);
  assert.match(context.text, /Organelles \(Lecture, Not started, the open page\)/);
  assert.doesNotMatch(context.text, /nucleus/);
  assert.match(context.text, /Ribosomes build proteins/);
});

test("module and course actions get only the course and module details", async () => {
  const { course, module, page } = await workspace();
  const location = { pageId: page.id, moduleId: module.id, courseId: course.id };
  assert.deepEqual(labels(await buildActionContext(location, "module", [], true, null)), ["Course", "Module"]);
  assert.deepEqual(labels(await buildActionContext(location, "course", [], true, null)), ["Course"]);
});

test("a transcript already pasted into the page isn't sent again", async () => {
  const { page } = await workspace();
  await updatePage(page.id, { content: "<p>The nucleus holds DNA.</p><p>Mitochondria make energy for the cell.</p>" });
  const context = await buildChatContext(page.id, "", false, null);
  assert.ok(!labels(context).includes("Transcripts"));
});

test("over the budget, transcripts are cut first and say so", async () => {
  const { page } = await workspace("energy ".repeat(CONTEXT_BUDGET_CHARS / 4));
  const context = await buildChatContext(page.id, "", false, null);
  const transcripts = context.layers.find((layer) => layer.label === "Transcripts");
  assert.ok(transcripts.trimmed);
  assert.match(transcripts.detail, /cut to fit/);
  assert.match(context.text, /\[… cut to fit\]/);
  assert.match(context.text, /The nucleus holds DNA/);
  assert.ok(context.text.length < CONTEXT_BUDGET_CHARS + 1000);
});

test("no page open means no context, except the AI profile", async () => {
  const profile = { name: "French", language: "fr", explanationLevel: 0, tone: 0, answerLength: 0, keepTerms: false, useExamples: false, hintsForAssessed: false };
  const context = await buildChatContext(null, "", true, profile);
  assert.equal(context.text, "");
  assert.deepEqual(labels(context), ["AI profile"]);
});
