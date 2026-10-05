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
const { addCards, deckCounts, deleteCard, deleteOrphanCards, editCard, getDeckCards, getDueCards, reviewCard } =
  await import('../src/features/flashcards/lib/card/actions.ts');
const { describeInterval, Grade, nextSchedule } = await import('../src/features/flashcards/lib/schedule.ts');
const { parseCards } = await import('../src/features/flashcards/lib/generate.ts');
await initDb();

const fresh = { ease: 2.5, interval_days: 0, repetitions: 0 };

test('the schedule brings a new card back after 10 minutes, then 1 day, then 3 days, then by its ease', () => {
  const again = nextSchedule(fresh, Grade.Again);
  assert.equal(again.ease, 2.3);
  assert.equal(describeInterval(again.interval_days), '10 min');
  assert.equal(again.repetitions, 0);
  const first = nextSchedule(fresh, Grade.Good);
  assert.equal(first.interval_days, 1);
  const second = nextSchedule(first, Grade.Good);
  assert.equal(second.interval_days, 3);
  assert.equal(nextSchedule(second, Grade.Good).interval_days, 8);
  assert.equal(nextSchedule(fresh, Grade.Easy).interval_days, 4);
  assert.equal(describeInterval(nextSchedule(fresh, Grade.Hard).interval_days), '12 h');
  assert.ok(nextSchedule(second, Grade.Hard).interval_days < 8);
  assert.equal(nextSchedule({ ease: 1.3, interval_days: 5, repetitions: 3 }, Grade.Again).ease, 1.3);
  assert.equal(describeInterval(10 / 1440), '10 min');
  assert.equal(describeInterval(1.2), '1 day');
  assert.equal(describeInterval(60), '2 months');
});

test('cards need a front and a back, are due straight away, and keep score as they are reviewed', async () => {
  const course = await createCourse({ name: 'Security' });
  const module = await createModule(course.id, { name: 'Threats' });
  const page = await createPage(module.id, { title: 'Actors' });
  await assert.rejects(addCards(module.id, [{ front: ' ', back: 'x', page_id: null }]), /front of the card/);
  await assert.rejects(addCards(module.id, [{ front: 'x', back: '', page_id: null }]), /back of the card/);
  await addCards(module.id, [
    { front: 'Threat actor?', back: 'Who carries out an attack.', page_id: page.id },
    { front: 'Phishing?', back: 'Tricking people into giving secrets.', page_id: null }
  ]);

  const cards = await getDeckCards(module.id);
  assert.equal(cards.length, 2);
  assert.equal(cards.find((card) => card.page_id === page.id).page_title, 'Actors');
  assert.deepEqual(deckCounts(cards), { due: 2, fresh: 2, total: 2 });

  const [first] = await getDueCards(module.id);
  await reviewCard(first, Grade.Good);
  const [second] = (await getDueCards(module.id));
  await reviewCard(second, Grade.Again);
  const after = await getDeckCards(module.id);
  const good = after.find((card) => card.id === first.id);
  const again = after.find((card) => card.id === second.id);
  assert.equal(good.right_count, 1);
  assert.equal(good.interval_days, 1);
  assert.equal(again.wrong_count, 1);
  assert.equal((await getDueCards(module.id)).length, 0);
  assert.equal(deckCounts(after, new Date(Date.now() + 11 * 60_000)).due, 1);

  await editCard(again.id, ' Phishing ', ' A fake message that steals secrets. ', page.id);
  const edited = (await getDeckCards(module.id)).find((card) => card.id === again.id);
  assert.equal(edited.front, 'Phishing');
  assert.equal(edited.page_id, page.id);
});

test('cards hide with their page or module in Recently deleted, go when erased, and survive a backup', async () => {
  const course = await createCourse({ name: 'Biology' });
  const module = await createModule(course.id, { name: 'Cells' });
  const page = await createPage(module.id, { title: 'Mitosis' });
  await addCards(module.id, [
    { front: 'Mitosis?', back: 'Cell division into two identical cells.', page_id: page.id },
    { front: 'Cell?', back: 'The smallest unit of life.', page_id: null }
  ]);

  const backup = await createBackup();
  const loose = (await getDeckCards(module.id)).find((card) => card.page_id === null);
  await deleteCard(loose.id);
  await restoreBackup(backup);
  assert.equal((await getDeckCards(module.id)).length, 2);

  await deletePage(page.id);
  assert.equal((await getDeckCards(module.id)).length, 1);
  await deleteModule(module.id);
  assert.equal((await getDeckCards(module.id)).length, 0);
  await eraseItems(await getDeletedItems());
  await deleteOrphanCards();
  assert.equal((await createBackup()).flashcards.filter((card) => card.module_id === module.id).length, 0);
});

test('agent replies become cards only when they have a front and a back, from one of the given pages', () => {
  const reply = 'Here you go:\n[{"front":"A","back":"B","page_id":3},{"front":"C","back":"D","page_id":99},{"front":"","back":"E"}]';
  assert.deepEqual(parseCards(reply, new Set([3])), [
    { front: 'A', back: 'B', page_id: 3 },
    { front: 'C', back: 'D', page_id: null }
  ]);
  assert.throws(() => parseCards('Sorry, I cannot.', new Set()), /didn’t return any flashcards/);
  assert.throws(() => parseCards('[{front: A}]', new Set()), /couldn’t be read/);
});
