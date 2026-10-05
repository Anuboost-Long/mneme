import assert from 'node:assert/strict';
import { test } from 'node:test';

const { addMonths, isDayOutOfBounds, isMonthOutOfBounds, monthGrid, parseIsoDate, shiftDay, toIsoDate, yearPage } =
  await import('../src/shared/ui/date/calendarGrid.ts');

test('a month grid starts on Monday and always shows six weeks', () => {
  const october = monthGrid(2026, 9);
  assert.equal(october.length, 42);
  assert.deepEqual(october[0], { iso: '2026-09-28', day: 28, inMonth: false });
  assert.equal(october.find((day) => day.inMonth).iso, '2026-10-01');
  assert.equal(october.filter((day) => day.inMonth).length, 31);
});

test('dates move across months and years, and bounds rule days and months out', () => {
  assert.equal(shiftDay('2026-10-31', 1), '2026-11-01');
  assert.equal(shiftDay('2026-01-01', -1), '2025-12-31');
  assert.deepEqual(addMonths({ year: 2026, month: 11 }, 1), { year: 2027, month: 0 });
  assert.equal(toIsoDate(parseIsoDate('2026-02-28')), '2026-02-28');
  assert.equal(parseIsoDate('not a date'), null);
  assert.equal(isDayOutOfBounds('2026-10-05', { min: '2026-10-06' }), true);
  assert.equal(isMonthOutOfBounds(2026, 8, { min: '2026-10-06' }), true);
  assert.equal(isMonthOutOfBounds(2026, 9, { min: '2026-10-06' }), false);
  assert.deepEqual(yearPage(2026).slice(0, 2), [2016, 2017]);
});
