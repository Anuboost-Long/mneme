import assert from "node:assert/strict";
import { test } from "node:test";

import { useTestDesktop } from "./support/desktop.mjs";

const { database, writtenFiles } = useTestDesktop();
const { initDb } = await import("../src/shared/lib/db/index.ts");
const { createCourse, eraseCourse, getCourse } =
  await import("../src/features/courses/lib/course/actions.ts");
const { createModule, getModules } = await import("../src/features/courses/lib/module/actions.ts");
const { getPage, getPages, createPage, updatePage } =
  await import("../src/features/courses/lib/page/actions.ts");
const { createAttachment, getAttachment } =
  await import("../src/features/courses/lib/attachment/actions.ts");
const { createRecording, getRecording } =
  await import("../src/features/courses/lib/recording/actions.ts");
const { backupArchive, createBackup, readBackupFile, restoreBackup } =
  await import("../src/features/courses/lib/backup/actions.ts");
await initDb();

const png = (seed) => `data:image/png;base64,${Buffer.alloc(64, seed).toString("base64")}`;
const bytesOf = (reference) => Buffer.from(writtenFiles.get(reference));
const referenceOf = (url) => url.split("/").pop();

test("a backup carries every file its pages use, and a restore brings them back under new references", async () => {
  const course = await createCourse({ name: "Anatomy", icon: png(1) });
  const module = await createModule(course.id, { name: "Bones", icon: png(2) });
  const page = await createPage(module.id, {
    title: "Skull",
    icon: png(3),
    content: `<p>Skull</p><img src="${png(4)}">`
  });
  const attachmentId = await createAttachment(
    page.id,
    new File([Buffer.from("slides")], "slides.pdf", { type: "application/pdf" })
  );
  const { id: recordingId } = await createRecording(
    page.id,
    new Blob([Buffer.from("audio")], { type: "audio/mp4" }),
    1000
  );
  const imageSrc = (await getPage(page.id)).content.match(/src="([^"]+)"/)[1];
  await updatePage(page.id, {
    content: `<p>Skull</p><img src="${imageSrc}"><div data-attachment-id="${attachmentId}"></div><div data-recording-id="${recordingId}"></div>`
  });
  const original = {
    courseIcon: bytesOf((await getCourse(course.id)).icon),
    moduleIcon: bytesOf((await getModules(course.id))[0].icon),
    pageIcon: bytesOf((await getPage(page.id)).icon),
    image: bytesOf(referenceOf(imageSrc)),
    attachment: bytesOf((await getAttachment(attachmentId)).file_path),
    recording: bytesOf((await getRecording(recordingId)).file_reference)
  };

  const archive = await backupArchive(await createBackup());
  const backup = await readBackupFile(new File([archive], "mneme-backup.zip"));
  assert.equal(backup.version, 2);
  assert.equal(Object.keys(backup.files).length, 6);

  await eraseCourse(course.id);
  await restoreBackup(backup);

  const restoredCourse = await getCourse(course.id);
  const [restoredModule] = await getModules(course.id);
  const [restoredPage] = await getPages(restoredModule.id);
  const restoredContent = (await getPage(restoredPage.id)).content;
  const restoredSrc = restoredContent.match(/src="([^"]+)"/)[1];
  const restoredAttachmentId = Number(restoredContent.match(/data-attachment-id="(\d+)"/)[1]);
  const restoredRecordingId = Number(restoredContent.match(/data-recording-id="(\d+)"/)[1]);

  assert.notEqual(restoredSrc, imageSrc, "the image points at its restored file");
  assert.deepEqual(bytesOf(restoredCourse.icon), original.courseIcon);
  assert.deepEqual(bytesOf(restoredModule.icon), original.moduleIcon);
  assert.deepEqual(bytesOf(restoredPage.icon), original.pageIcon);
  assert.deepEqual(bytesOf(referenceOf(restoredSrc)), original.image);
  assert.deepEqual(
    bytesOf((await getAttachment(restoredAttachmentId)).file_path),
    original.attachment
  );
  assert.deepEqual(
    bytesOf((await getRecording(restoredRecordingId)).file_reference),
    original.recording
  );
  await eraseCourse(course.id);
});

test("a version 1 JSON backup still restores", async () => {
  const backup = {
    version: 1,
    exportedAt: "2026-01-01T00:00:00.000Z",
    courses: [
      {
        id: 900,
        name: "Old course",
        description: null,
        icon: "globe",
        color: null,
        created_at: "2026-01-01",
        updated_at: "2026-01-01"
      }
    ],
    modules: [
      {
        id: 900,
        course_id: 900,
        name: "Old module",
        description: null,
        created_at: "2026-01-01",
        updated_at: "2026-01-01"
      }
    ],
    pages: [
      {
        id: 900,
        module_id: 900,
        title: "Old page",
        type: "lesson",
        content: "<p>Kept</p>",
        created_at: "2026-01-01",
        updated_at: "2026-01-01"
      }
    ]
  };
  await restoreBackup(
    await readBackupFile(new File([JSON.stringify(backup)], "mneme-backup.json"))
  );
  assert.equal((await getCourse(900)).icon, "globe");
  assert.equal((await getPage(900)).content, "<p>Kept</p>");
  await eraseCourse(900);
});

test("restoring over existing courses leaves them and their files alone", async () => {
  const course = await createCourse({ name: "Kept", icon: png(9) });
  const icon = (await getCourse(course.id)).icon;
  const backup = await readBackupFile(
    new File([await backupArchive(await createBackup())], "b.zip")
  );
  const filesBefore = writtenFiles.size;
  await restoreBackup(backup);
  assert.equal((await getCourse(course.id)).icon, icon);
  assert.equal(writtenFiles.size, filesBefore, "no file is written for a row that already exists");
  assert.equal(
    database.prepare("SELECT COUNT(*) AS n FROM course WHERE name = ?").get("Kept").n,
    1
  );
  await eraseCourse(course.id);
});

test("a file that is not a backup is refused", async () => {
  await assert.rejects(
    readBackupFile(new File(["not a backup"], "notes.txt")),
    /isn't a valid Mneme backup/
  );
});

test('Home widgets and saved layouts are backed up, without overwriting an existing Home', async () => {
  const { addWidget, getWidgets, replaceWidgets } = await import('../src/features/home/lib/widget/actions.ts');
  const { deleteLayout, getLayouts, saveLayout } = await import('../src/features/home/lib/layout/actions.ts');
  await getWidgets([]);
  await replaceWidgets([]);
  await addWidget({ kind: 'note', size: 'large', config: { text: 'Exam on Friday' } });
  await addWidget({ kind: 'streak', size: 'small', config: {} });
  const layout = await saveLayout('Exam week', [{ kind: 'streak', size: 'small', config: {} }]);
  const backup = await readBackupFile(new File([await backupArchive(await createBackup())], 'b.zip'));

  await replaceWidgets([]);
  await deleteLayout(layout.id);
  await restoreBackup(backup);
  const home = (await getWidgets([])).map(({ kind, size, config }) => ({ kind, size, config }));
  assert.deepEqual(home, [
    { kind: 'note', size: 'large', config: { text: 'Exam on Friday' } },
    { kind: 'streak', size: 'small', config: {} }
  ]);
  assert.deepEqual((await getLayouts()).map((item) => item.name), ['Exam week']);

  await replaceWidgets([{ kind: 'continue', size: 'medium', config: {} }]);
  await restoreBackup(backup);
  assert.deepEqual((await getWidgets([])).map((widget) => widget.kind), ['continue']);
  assert.equal((await getLayouts()).length, 1);
});
