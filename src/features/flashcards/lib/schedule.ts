export enum Grade {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4
}

export const grades = [Grade.Again, Grade.Hard, Grade.Good, Grade.Easy];

export const gradeLabels: Record<Grade, string> = {
  [Grade.Again]: "Again",
  [Grade.Hard]: "Hard",
  [Grade.Good]: "Good",
  [Grade.Easy]: "Easy"
};

export type Schedule = { ease: number; interval_days: number; repetitions: number };

const MINUTES = 1 / (24 * 60);
const AGAIN_DAYS = 10 * MINUTES;
const HARD_NEW_DAYS = 0.5;
const LOWEST_EASE = 1.3;

const days = (value: number) => (value >= 1 ? Math.round(value) : value);

function goodInterval({ interval_days, repetitions, ease }: Schedule) {
  if (repetitions === 0) return 1;
  if (repetitions === 1) return 3;
  return days(Math.max(interval_days, 1) * ease);
}

export function nextSchedule(card: Schedule, grade: Grade): Schedule {
  switch (grade) {
    case Grade.Again:
      return { ease: Math.max(LOWEST_EASE, card.ease - 0.2), interval_days: AGAIN_DAYS, repetitions: 0 };
    case Grade.Hard:
      if (card.repetitions === 0)
        return { ease: Math.max(LOWEST_EASE, card.ease - 0.15), interval_days: HARD_NEW_DAYS, repetitions: 0 };
      return {
        ease: Math.max(LOWEST_EASE, card.ease - 0.15),
        interval_days: days(Math.max(1, card.interval_days * 1.2)),
        repetitions: card.repetitions + 1
      };
    case Grade.Good:
      return { ease: card.ease, interval_days: goodInterval(card), repetitions: card.repetitions + 1 };
    case Grade.Easy:
      return {
        ease: card.ease + 0.15,
        interval_days: card.repetitions === 0 ? 4 : days(goodInterval(card) * 1.3),
        repetitions: card.repetitions + 1
      };
  }
}

export function describeInterval(intervalDays: number) {
  const minutes = Math.round(intervalDays / MINUTES);
  if (minutes < 60) return `${minutes} min`;
  if (intervalDays < 1) return `${Math.round(minutes / 60)} h`;
  const days = Math.round(intervalDays);
  if (days < 30) return days === 1 ? "1 day" : `${days} days`;
  const months = Math.round(intervalDays / 30);
  if (months < 12) return months === 1 ? "1 month" : `${months} months`;
  const years = Math.round((intervalDays / 365) * 10) / 10;
  return years === 1 ? "1 year" : `${years} years`;
}

export function dueAfter(intervalDays: number, now = new Date()) {
  return new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);
}
