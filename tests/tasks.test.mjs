import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useTestDesktop } from './support/desktop.mjs';

useTestDesktop();
const { initDb } = await import('../src/shared/lib/db/index.ts');
const { createCourse } = await import('../src/features/courses/lib/course/actions.ts');
const { createModule, deleteModule } = await import('../src/features/courses/lib/module/actions.ts');
const { createPage, deletePage } = await import('../src/features/courses/lib/page/actions.ts');
const { eraseItems, getDeletedItems } = await import('../src/features/recently-deleted/lib/deleted-item/actions.ts');
const { createBackup, restoreBackup } = await import('../src/features/courses/lib/backup/actions.ts');
const { addTasks, completeTask, deleteOrphanTasks, deleteTask, editTask, getTasks } =
  await import('../src/features/tasks/lib/task/actions.ts');
const { addDays, dueLabel, taskGroup, TaskType } = await import('../src/features/tasks/lib/task/types.ts');
const { activityType, addImportedTasks, pageTaskType } = await import('../src/features/tasks/lib/fromImport.ts');
await initDb();

const today = '2026-10-06';

test('tasks fall into Overdue, Today, This week, Later, No due date and Done', () => {
  assert.equal(taskGroup({ due_on: '2026-10-05', completed_at: null }, today), 'overdue');
  assert.equal(taskGroup({ due_on: today, completed_at: null }, today), 'today');
  assert.equal(taskGroup({ due_on: '2026-10-13', completed_at: null }, today), 'week');
  assert.equal(taskGroup({ due_on: '2026-10-14', completed_at: null }, today), 'later');
  assert.equal(taskGroup({ due_on: null, completed_at: null }, today), 'undated');
  assert.equal(taskGroup({ due_on: '2026-10-01', completed_at: '2026-10-02 10:00:00' }, today), 'done');
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(dueLabel(today, today), 'Due today');
  assert.equal(dueLabel('2026-10-07', today), 'Due tomorrow');
});

test('a task needs a name, can be edited, ticked off and deleted', async () => {
  await assert.rejects(addTasks([{ title: '  ', type: TaskType.Personal, course_id: null, module_id: null, due_on: null }]), /Give the task a name/);
  await addTasks([{ title: ' Buy a lab coat ', type: TaskType.Personal, course_id: null, module_id: null, due_on: '2026-10-08' }]);
  let [task] = (await getTasks()).filter((item) => item.title === 'Buy a lab coat');
  assert.equal(task.course_name, null);
  await editTask(task.id, { title: 'Buy a lab coat and goggles', type: TaskType.Personal, course_id: null, module_id: null, due_on: '' });
  await completeTask(task.id, true);
  [task] = (await getTasks()).filter((item) => item.id === task.id);
  assert.equal(task.title, 'Buy a lab coat and goggles');
  assert.equal(task.due_on, null);
  assert.ok(task.completed_at);
  assert.equal((await getTasks({ open: true })).some((item) => item.id === task.id), false);
  await completeTask(task.id, false);
  assert.equal((await getTasks({ open: true })).some((item) => item.id === task.id), true);
  await deleteTask(task.id);
  assert.equal((await getTasks()).some((item) => item.id === task.id), false);
});

test('an import adds its page and ticked activities as tasks, once', async () => {
  assert.equal(activityType('Assignment 2: Threat model'), TaskType.Assignment);
  assert.equal(activityType('Knowledge check 3'), TaskType.Quiz);
  assert.equal(activityType('Discussion: Week 4'), TaskType.Discussion);
  assert.equal(activityType('Learning Activity 2'), TaskType.Exercise);
  assert.equal(pageTaskType(3, 'quiz'), TaskType.Quiz);
  assert.equal(pageTaskType(1, 'lesson'), null);

  const course = await createCourse({ name: 'Secure By Design' });
  const module = await createModule(course.id, { name: 'Module 5' });
  const page = await createPage(module.id, { title: 'Assessment 1 brief', type: 5 });
  const input = {
    page,
    pageTask: pageTaskType(5),
    activities: ['Discussion: Week 5', 'Learning Activity 1'],
    dueDates: [{ text: 'Due 24 October', date: '2026-10-24' }, { text: 'Draft 17 October', date: '2026-10-17' }],
    courseId: course.id,
    moduleId: module.id
  };
  assert.equal(await addImportedTasks(input), 3);
  assert.equal(await addImportedTasks(input), 0);
  const tasks = await getTasks({ courseId: course.id });
  const brief = tasks.find((task) => task.title === 'Assessment 1 brief');
  assert.equal(brief.type, TaskType.Assignment);
  assert.equal(brief.due_on, '2026-10-17');
  assert.equal(brief.page_title, 'Assessment 1 brief');
  assert.equal(brief.module_name, 'Module 5');
  assert.deepEqual(tasks.map((task) => task.type).sort(), [TaskType.Exercise, TaskType.Discussion, TaskType.Assignment].sort());

  await deletePage(page.id);
  assert.equal((await getTasks({ courseId: course.id })).find((task) => task.id === brief.id).page_title, null);
});

test('tasks survive a backup, hide with their module, and go when it is erased', async () => {
  const course = await createCourse({ name: 'Chemistry' });
  const module = await createModule(course.id, { name: 'Acids' });
  await addTasks([{ title: 'Titration lab', type: TaskType.Exercise, course_id: course.id, module_id: module.id, due_on: null }]);
  const backup = await createBackup();
  const [task] = await getTasks({ courseId: course.id });
  await deleteTask(task.id);
  await restoreBackup(backup);
  assert.equal((await getTasks({ courseId: course.id })).length, 1);

  await deleteModule(module.id);
  assert.equal((await getTasks({ courseId: course.id })).length, 0);
  await eraseItems(await getDeletedItems());
  await deleteOrphanTasks();
  assert.equal((await createBackup()).tasks.some((item) => item.module_id === module.id), false);
});
