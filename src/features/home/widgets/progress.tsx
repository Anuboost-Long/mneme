import clsx from "clsx";

import { getStreak, getStudyDays } from "../../../shared/lib/study-day/actions";
import CourseIcon from "../../../shared/ui/CourseIcon";
import { Caption } from "../../../shared/ui/Typography";
import { CompletionStatus, completionStatusLabels } from "../../courses/lib/completion-status";
import { countPages, countPagesBy, getModuleProgress } from "../lib/dashboard/actions";
import { useWidgetData } from "../lib/useWidgetData";
import { ProgressLine, RowLink, Rows, rowsFor, Stat, WidgetNote } from "./parts";
import { pageFilter } from "./study";
import type { WidgetProps } from "./types";

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count.toLocaleString()} ${count === 1 ? one : many}`;

export function StreakWidget({ widget }: Readonly<WidgetProps>) {
  const streak = useWidgetData(getStreak, "streak");
  const week = useWidgetData(() => getStudyDays(7), "week");
  if (!streak) return null;
  return (
    <div className={clsx("flex h-full items-end justify-between gap-4")}>
      <Stat
        value={streak.streak}
        label={streak.streak === 1 ? "day streak" : "days streak"}
        detail={`Best ${plural(streak.best, "day")}`}
      />
      {widget.size !== "small" && week && (
        <ol aria-label="Last 7 days" className={clsx("flex gap-1.5 px-3 pb-4")}>
          {week.map((day) => {
            const date = new Date(`${day.day}T12:00:00`);
            return (
              <li key={day.day} className={clsx("flex flex-col items-center gap-1")}>
                <span
                  title={`${date.toLocaleDateString(undefined, { weekday: "long" })}: ${plural(day.opened, "page")} opened`}
                  className={clsx(
                    "size-3 rounded-full",
                    day.opened > 0 ? "bg-accent" : "bg-ink/10"
                  )}
                />
                <Caption as="span" tone="muted" aria-hidden="true">
                  {date.toLocaleDateString(undefined, { weekday: "narrow" })}
                </Caption>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

const shortDate = (day: string) =>
  new Date(day + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

const metricLabels = { opened: "Pages opened", completed: "Pages finished" } as const;

export function ActivityWidget({ widget }: Readonly<WidgetProps>) {
  const days = Number(widget.config.days) || 14;
  const metric = widget.config.metric === "completed" ? "completed" : "opened";
  const history = useWidgetData(() => getStudyDays(days), String(days));
  if (!history) return null;
  const counts = history.map((day) => day[metric]);
  const max = Math.max(1, ...counts);
  const total = counts.reduce((sum, count) => sum + count, 0);
  return (
    <figure className={clsx("flex h-full flex-col px-3 pb-3")}>
      <figcaption className={clsx("flex items-baseline gap-2")}>
        <span className={clsx("text-2xl font-semibold tabular-nums")}>{total}</span>
        <Caption as="span" tone="muted">
          {metricLabels[metric].toLowerCase()}, last {days} days
        </Caption>
      </figcaption>
      <div
        role="img"
        aria-label={`${metricLabels[metric]} per day, last ${days} days`}
        className={clsx("mt-2 flex min-h-0 flex-1 items-end gap-0.5")}
      >
        {history.map((day) => (
          <span
            key={day.day}
            title={shortDate(day.day) + ": " + day[metric]}
            style={{ height: `${Math.max(4, (day[metric] / max) * 100)}%` }}
            className={clsx(
              "min-w-0 flex-1 rounded-sm",
              day[metric] > 0 ? "bg-ink/60" : "bg-ink/10"
            )}
          />
        ))}
      </div>
    </figure>
  );
}

const periods: Record<string, number> = { week: 7, month: 30, year: 365 };

export function FinishedWidget({ widget }: Readonly<WidgetProps>) {
  const period =
    typeof widget.config.period === "string" && widget.config.period in periods
      ? widget.config.period
      : "week";
  const history = useWidgetData(() => getStudyDays(periods[period]), period);
  if (!history) return null;
  const finished = history.reduce((sum, day) => sum + day.completed, 0);
  return (
    <Stat
      value={finished}
      label={finished === 1 ? "page finished" : "pages finished"}
      detail={`This ${period}`}
    />
  );
}

const statusOrder = [
  CompletionStatus.Completed,
  CompletionStatus.InProgress,
  CompletionStatus.RevisionNeeded,
  CompletionStatus.NotStarted
];

const statusColors: Record<CompletionStatus, string> = {
  [CompletionStatus.Completed]: "bg-success",
  [CompletionStatus.InProgress]: "bg-info",
  [CompletionStatus.RevisionNeeded]: "bg-warning",
  [CompletionStatus.NotStarted]: "bg-ink/15"
};

export function StatusWidget({ widget }: Readonly<WidgetProps>) {
  const courseId = Number(widget.config.courseId) || undefined;
  const counts = useWidgetData(() => countPagesBy("status", courseId), String(courseId));
  if (!counts) return null;
  const total = statusOrder.reduce((sum, status) => sum + (counts.get(status) ?? 0), 0);
  if (total === 0) return <WidgetNote>No pages yet.</WidgetNote>;
  return (
    <div className={clsx("flex h-full flex-col justify-end gap-3 px-3 pb-3")}>
      <div
        role="img"
        aria-label={statusOrder
          .map((status) => `${completionStatusLabels[status]}: ${counts.get(status) ?? 0}`)
          .join(", ")}
        className={clsx("flex h-2 overflow-hidden rounded-full bg-ink/10")}
      >
        {statusOrder.map((status) => (
          <span
            key={status}
            style={{ width: `${((counts.get(status) ?? 0) / total) * 100}%` }}
            className={statusColors[status]}
          />
        ))}
      </div>
      <ul
        className={clsx(
          "grid gap-x-4 gap-y-1",
          widget.size === "small" ? "grid-cols-1" : "grid-cols-2"
        )}
      >
        {statusOrder.map((status) => (
          <li key={status} className={clsx("flex items-center gap-2 text-xs")}>
            <span
              aria-hidden="true"
              className={clsx("size-2 shrink-0 rounded-full", statusColors[status])}
            />
            <span className={clsx("min-w-0 flex-1 truncate")}>
              {completionStatusLabels[status]}
            </span>
            <span className={clsx("tabular-nums text-muted")}>{counts.get(status) ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Modules still in progress, or with a course chosen, every module of it.
export function ModulesWidget({ widget }: Readonly<WidgetProps>) {
  const courseId = Number(widget.config.courseId) || undefined;
  const limit = rowsFor(widget.size);
  const modules = useWidgetData(
    () => getModuleProgress({ courseId, includeDone: Boolean(courseId), limit }),
    `${courseId}-${limit}`
  );
  if (!modules) return null;
  if (modules.length === 0)
    return <WidgetNote>Modules with pages left to finish show up here.</WidgetNote>;
  return (
    <Rows>
      {modules.map((module) => (
        <RowLink key={module.id} to={`/courses/${module.course_id}/modules/${module.id}`}>
          <CourseIcon icon={module.icon} color={module.course_color} small />
          <span className={clsx("min-w-0 flex-1 truncate")}>
            <span className={clsx("font-medium")}>{module.name}</span>
            {!courseId && (
              <span className={clsx("hidden text-muted @md:inline")}> · {module.course_name}</span>
            )}
          </span>
          {widget.size !== "small" && (
            <span className={clsx("w-16 shrink-0")}>
              <ProgressLine
                progress={Math.round((module.done / module.total) * 100)}
                label={`${module.name} progress`}
              />
            </span>
          )}
          <Caption as="span" tone="muted" className={clsx("w-10 shrink-0 text-right tabular-nums")}>
            {module.done}/{module.total}
          </Caption>
        </RowLink>
      ))}
    </Rows>
  );
}

export function CourseProgressWidget({ widget, courses }: Readonly<WidgetProps>) {
  const course = courses.find((item) => item.id === Number(widget.config.courseId)) ?? courses[0];
  const modules = useWidgetData(
    () =>
      course
        ? getModuleProgress({ courseId: course.id, includeDone: true, limit: 50 })
        : Promise.resolve([]),
    String(course?.id)
  );
  if (!course) return <WidgetNote>Choose a course in this widget’s settings.</WidgetNote>;
  if (!modules) return null;
  const total = modules.reduce((sum, module) => sum + module.total, 0);
  const done = modules.reduce((sum, module) => sum + module.done, 0);
  const percent = total ? Math.round((done / total) * 100) : 0;
  const shown = widget.size === "large" ? modules.slice(0, 7) : [];
  return (
    <div className={clsx("flex h-full flex-col px-3 pb-3", shown.length === 0 && "justify-end")}>
      <div className={clsx("flex items-center gap-3")}>
        <CourseIcon icon={course.icon} color={course.color} small />
        <p className={clsx("min-w-0 flex-1 truncate text-sm font-medium")}>{course.name}</p>
      </div>
      <p className={clsx("mt-2 text-3xl font-semibold tracking-tight tabular-nums")}>{percent}%</p>
      <ProgressLine progress={percent} label={`${course.name} progress`} />
      <Caption tone="muted" className={clsx("mt-1")}>
        {done} of {plural(total, "page")} done
      </Caption>
      {shown.length > 0 && (
        <ul className={clsx("mt-3 space-y-2")}>
          {shown.map((module) => (
            <li
              key={module.id}
              className={clsx(
                "grid grid-cols-[minmax(0,1fr)_4rem_2.5rem] items-center gap-2 text-xs"
              )}
            >
              <span className={clsx("truncate")}>{module.name}</span>
              <ProgressLine
                progress={Math.round((module.done / module.total) * 100)}
                label={`${module.name} progress`}
              />
              <span className={clsx("text-right tabular-nums text-muted")}>
                {module.done}/{module.total}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PageCountWidget({ widget }: Readonly<WidgetProps>) {
  const filter = pageFilter(widget.config);
  const count = useWidgetData(() => countPages(filter), JSON.stringify(filter));
  if (count === undefined) return null;
  const custom = typeof widget.config.label === "string" ? widget.config.label.trim() : "";
  const label = custom || (count === 1 ? "page" : "pages");
  return <Stat value={count.toLocaleString()} label={label} />;
}
