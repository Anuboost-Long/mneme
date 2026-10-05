export type DateBounds = { min?: string | null; max?: string | null };

export type CalendarDay = { iso: string; day: number; inMonth: boolean };

export type MonthView = { year: number; month: number };

export function parseIsoDate(iso: string | null | undefined) {
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function shiftDay(iso: string, days: number) {
  const date = parseIsoDate(iso) ?? new Date();
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

export function addMonths({ year, month }: MonthView, delta: number): MonthView {
  const moved = new Date(year, month + delta, 1);
  return { year: moved.getFullYear(), month: moved.getMonth() };
}

export function isDayOutOfBounds(iso: string, bounds: DateBounds = {}) {
  if (bounds.min && iso < bounds.min) return true;
  return Boolean(bounds.max && iso > bounds.max);
}

export function isMonthOutOfBounds(year: number, month: number, bounds: DateBounds = {}) {
  if (bounds.min && toIsoDate(new Date(year, month + 1, 0)) < bounds.min) return true;
  return Boolean(bounds.max && toIsoDate(new Date(year, month, 1)) > bounds.max);
}

export function isYearOutOfBounds(year: number, bounds: DateBounds = {}) {
  if (bounds.min && `${year}-12-31` < bounds.min) return true;
  return Boolean(bounds.max && `${year}-01-01` > bounds.max);
}

export function monthGrid(year: number, month: number, weekStart = 1): CalendarDay[] {
  const lead = (new Date(year, month, 1).getDay() - weekStart + 7) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, 1 - lead + index);
    return { iso: toIsoDate(date), day: date.getDate(), inMonth: date.getMonth() === month };
  });
}

export function yearPage(around: number, size = 12) {
  const start = Math.floor(around / size) * size;
  return Array.from({ length: size }, (_, index) => start + index);
}
