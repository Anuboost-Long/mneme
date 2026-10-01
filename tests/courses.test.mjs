import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useTestDesktop } from './support/desktop.mjs';

const { database, calls } = useTestDesktop();
const { initDb } = await import('../src/shared/lib/db/index.ts');
const { createCourse, getCourses, getCourse, updateCourse, deleteCourse } = await import('../src/features/courses/lib/courses.ts');
await initDb();

test('course lifecycle uses SQLite IDs, stable creation order, partial edits and bound values', async () => {
  await assert.rejects(createCourse({ name: '  ' }), /course name/);
  const first = await createCourse({ name: '  Biology  ', description: ' Cells ', icon: 'science', color: '#52745b' });
  const second = await createCourse({ name: "Literature'); DROP TABLE course; --" });
  assert.equal(first.name, 'Biology');
  assert.equal(first.description, 'Cells');
  assert.equal(second.description, null);
  assert.deepEqual((await getCourses()).map(course => course.id), [first.id, second.id]);
  database.prepare("UPDATE course SET updated_at = '2000-01-01' WHERE id = ?").run(first.id);
  const edited = await updateCourse(first.id, { name: 'Cell biology', description: '' });
  assert.equal(edited.description, null);
  assert.equal(edited.icon, 'science');
  assert.equal(edited.color, '#52745b');
  assert.notEqual(edited.updated_at, '2000-01-01');
  assert.deepEqual((await getCourses()).map(course => course.id), [first.id, second.id]);
  await assert.rejects(updateCourse(first.id, { name: ' ' }), /course name/);
  assert.equal((await getCourse(first.id)).name, 'Cell biology');
  await updateCourse(first.id, { icon: null, color: null });
  assert.equal((await getCourse(first.id)).icon, null);
  assert.equal((await getCourse(first.id)).color, null);
  await deleteCourse(first.id);
  assert.equal(await getCourse(first.id), undefined);
  assert.equal((await getCourses()).length, 1);
  await assert.rejects(updateCourse(first.id, { name: 'Missing' }), /no longer exists/);
  assert.ok(calls.every(call => !call.sql.includes(second.name)));
  await deleteCourse(second.id);
  assert.deepEqual(await getCourses(), []);
});

test('custom colours and uploaded icons survive reads and partial edits', async () => {
  const icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=';
  const course = await createCourse({ name: 'Custom subject', icon, color: '#7b2d43' });
  assert.equal((await getCourse(course.id)).icon, icon);
  const edited = await updateCourse(course.id, { name: 'Renamed subject' });
  assert.equal(edited.icon, icon);
  assert.equal(edited.color, '#7b2d43');
  await updateCourse(course.id, { icon: '🧠', color: '#ffffff' });
  assert.equal((await getCourse(course.id)).icon, '🧠');
  await deleteCourse(course.id);
});

test('a new course defaults to not-started, 0% progress and unbookmarked, and each is filterable', async () => {
  const { CompletionStatus } = await import('../src/features/courses/lib/completion-status.ts');
  const course = await createCourse({ name: 'Chemistry' });
  assert.equal(course.status, CompletionStatus.NotStarted);
  assert.equal(course.progress, 0);
  assert.equal(course.bookmarked, false);

  const bookmarked = await createCourse({ name: 'Physics', status: CompletionStatus.InProgress, progress: 42, bookmarked: true });
  assert.equal(bookmarked.status, CompletionStatus.InProgress);
  assert.equal(bookmarked.progress, 42);
  assert.equal(bookmarked.bookmarked, true);

  assert.deepEqual((await getCourses({ bookmarked: true })).map((c) => c.id), [bookmarked.id]);
  assert.deepEqual((await getCourses({ status: CompletionStatus.InProgress })).map((c) => c.id), [bookmarked.id]);

  const updated = await updateCourse(course.id, { progress: 150, bookmarked: true });
  assert.equal(updated.progress, 100, 'progress is clamped to 100');
  assert.deepEqual((await getCourses({ bookmarked: true })).map((c) => c.id).sort(), [course.id, bookmarked.id].sort());

  await deleteCourse(course.id);
  await deleteCourse(bookmarked.id);
});
