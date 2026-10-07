import clsx from "clsx";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import {
  addMonths,
  isDayOutOfBounds,
  isMonthOutOfBounds,
  isYearOutOfBounds,
  monthGrid,
  parseIsoDate,
  shiftDay,
  toIsoDate,
  yearPage,
  type DateBounds,
  type MonthView
} from "./calendarGrid";

type Panel = "days" | "months" | "years";

const YEARS_PER_PAGE = 12;

const monthNames = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2026, month, 1))
);
const shortMonthNames = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(2026, month, 1))
);
const weekdayNames = Array.from({ length: 7 }, (_, day) =>
  new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(new Date(2026, 0, 5 + day))
);
const fullDate = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const dayKeys: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

function Cell({
  label,
  name,
  selected,
  today,
  dimmed,
  tall,
  disabled,
  focusable,
  cellRef,
  onClick
}: Readonly<{
  label: string | number;
  name?: string;
  selected?: boolean;
  today?: boolean;
  dimmed?: boolean;
  tall?: boolean;
  disabled?: boolean;
  focusable?: boolean;
  cellRef?: (element: HTMLButtonElement | null) => void;
  onClick: () => void;
}>) {
  return (
    <button
      ref={cellRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={name}
      aria-pressed={selected}
      aria-current={today ? "date" : undefined}
      tabIndex={focusable === false ? -1 : undefined}
      className={clsx(
        "flex items-center justify-center rounded-md border text-sm tabular-nums",
        tall ? "h-10" : "h-8",
        selected
          ? "border-accent bg-accent font-semibold text-on-accent"
          : "border-transparent enabled:hover:bg-ink/6",
        !selected && today && "border-accent/60",
        !selected && dimmed && "text-muted/70",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink",
        "disabled:cursor-not-allowed disabled:opacity-30"
      )}
    >
      {label}
    </button>
  );
}

const arrowClass = clsx(
  "flex size-8 shrink-0 items-center justify-center rounded-md text-muted",
  "enabled:hover:bg-ink/6 enabled:hover:text-ink",
  "focus-visible:outline-2 focus-visible:outline-ink disabled:opacity-30"
);

function Chevron({ direction }: Readonly<{ direction: "left" | "right" }>) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === "left" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
    </svg>
  );
}

export default function Calendar({
  value,
  bounds = {},
  onSelect,
  onEscape
}: Readonly<{ value: string | null; bounds?: DateBounds; onSelect: (iso: string) => void; onEscape: () => void }>) {
  const todayIso = toIsoDate(new Date());
  const start = parseIsoDate(value) ?? new Date();
  const [panel, setPanel] = useState<Panel>("days");
  const [view, setView] = useState<MonthView>({ year: start.getFullYear(), month: start.getMonth() });
  const [focused, setFocused] = useState(value ?? todayIso);
  const cells = useRef(new Map<string, HTMLButtonElement>());
  const moved = useRef(false);

  useEffect(() => {
    if (!moved.current) return;
    cells.current.get(focused)?.focus();
  }, [focused, view]);

  useEffect(() => {
    cells.current.get(focused)?.focus();
  }, []);

  function stepTo(delta: number): MonthView {
    if (panel === "days") return addMonths(view, delta);
    return { year: view.year + delta * (panel === "years" ? YEARS_PER_PAGE : 1), month: view.month };
  }

  function cannotStep(delta: number) {
    const next = stepTo(delta);
    if (panel === "days") return isMonthOutOfBounds(next.year, next.month, bounds);
    if (panel === "months") return isYearOutOfBounds(next.year, bounds);
    return yearPage(next.year, YEARS_PER_PAGE).every((year) => isYearOutOfBounds(year, bounds));
  }

  function onGridKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onEscape();
      return;
    }
    if (panel !== "days") return;
    let next: string | null = null;
    if (dayKeys[event.key]) next = shiftDay(focused, dayKeys[event.key]);
    else if (event.key === "PageUp" || event.key === "PageDown") {
      const date = parseIsoDate(focused) ?? new Date();
      const target = addMonths({ year: date.getFullYear(), month: date.getMonth() }, event.key === "PageUp" ? -1 : 1);
      const lastDay = new Date(target.year, target.month + 1, 0).getDate();
      next = toIsoDate(new Date(target.year, target.month, Math.min(date.getDate(), lastDay)));
    }
    if (!next) return;
    event.preventDefault();
    const date = parseIsoDate(next) ?? new Date();
    moved.current = true;
    setFocused(next);
    setView({ year: date.getFullYear(), month: date.getMonth() });
  }

  const years = yearPage(view.year, YEARS_PER_PAGE);
  const nextPanel: Record<Panel, Panel> = { days: "months", months: "years", years: "days" };
  let title = `${years[0]} – ${years[years.length - 1]}`;
  if (panel === "days") title = `${monthNames[view.month]} ${view.year}`;
  else if (panel === "months") title = String(view.year);

  return (
    <div onKeyDown={onGridKey} className={clsx("w-72 space-y-3")}>
      <div className={clsx("flex items-center gap-1")}>
        <button type="button" onClick={() => setView(stepTo(-1))} disabled={cannotStep(-1)} aria-label="Previous" className={arrowClass}>
          <Chevron direction="left" />
        </button>
        <button
          type="button"
          onClick={() => setPanel(nextPanel[panel])}
          aria-label={panel === "years" ? "Back to days" : `Choose ${panel === "days" ? "month" : "year"}, ${title}`}
          className={clsx(
            "flex h-8 flex-1 items-center justify-center rounded-md text-sm font-semibold",
            panel === "days" ? "hover:bg-ink/6" : "bg-accent/12 text-ink hover:bg-accent/20",
            "focus-visible:outline-2 focus-visible:outline-ink"
          )}
        >
          {title}
        </button>
        <button type="button" onClick={() => setView(stepTo(1))} disabled={cannotStep(1)} aria-label="Next" className={arrowClass}>
          <Chevron direction="right" />
        </button>
      </div>
      {panel === "days" && (
        <div className={clsx("grid grid-cols-7 gap-1")}>
          {weekdayNames.map((name, index) => (
            <span key={`${name}${index}`} aria-hidden="true" className={clsx("py-1 text-center text-xs text-muted")}>
              {name}
            </span>
          ))}
          {monthGrid(view.year, view.month).map((day) => (
            <Cell
              key={day.iso}
              label={day.day}
              name={fullDate.format(parseIsoDate(day.iso) ?? new Date())}
              selected={day.iso === value}
              today={day.iso === todayIso}
              dimmed={!day.inMonth}
              disabled={isDayOutOfBounds(day.iso, bounds)}
              focusable={day.iso === focused}
              cellRef={(element) => {
                if (element) cells.current.set(day.iso, element);
                else cells.current.delete(day.iso);
              }}
              onClick={() => onSelect(day.iso)}
            />
          ))}
        </div>
      )}
      {panel === "months" && (
        <div className={clsx("grid grid-cols-3 gap-1.5")}>
          {shortMonthNames.map((name, month) => (
            <Cell
              key={name}
              label={name}
              tall
              selected={month === view.month}
              today={month === new Date().getMonth() && view.year === new Date().getFullYear()}
              disabled={isMonthOutOfBounds(view.year, month, bounds)}
              onClick={() => {
                setView({ ...view, month });
                setPanel("days");
              }}
            />
          ))}
        </div>
      )}
      {panel === "years" && (
        <div className={clsx("grid grid-cols-3 gap-1.5")}>
          {years.map((year) => (
            <Cell
              key={year}
              label={year}
              tall
              selected={year === view.year}
              today={year === new Date().getFullYear()}
              disabled={isYearOutOfBounds(year, bounds)}
              onClick={() => {
                setView({ ...view, year });
                setPanel("months");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
