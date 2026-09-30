import clsx from "clsx";
import { useNavigate } from "react-router-dom";

import CourseIcon from "../../../shared/ui/CourseIcon";
import { Caption } from "../../../shared/ui/Typography";
import ActionIcon from "../../ai-actions/components/ActionIcon";
import { getActionConnection, getActions } from "../../ai-actions/lib/actions";
import { pageTypeLabels } from "../../courses/components/PageForm";
import { typeGlyphs } from "../../courses/components/pageDisplay";
import type { Course } from "../../courses/lib/courses";
import { getCoursePageProgress, pageTypes, percentDone } from "../../courses/lib/pages";
import { countPagesBy, getAiUsage, getCourseActivity, getPages } from "../lib/dashboard";
import { useWidgetData } from "../lib/useWidgetData";
import { pageLink, RowLink, Rows, rowLink, rowsFor, Stat, WidgetNote } from "./parts";
import type { WidgetProps } from "./types";

function CourseRows({ courses }: Readonly<{ courses: Course[] }>) {
  const progress = useWidgetData(getCoursePageProgress, "progress");
  return (
    <Rows>
      {courses.map((course) => (
        <RowLink key={course.id} to={`/courses/${course.id}`}>
          <CourseIcon icon={course.icon} color={course.color} small />
          <span className={clsx("min-w-0 flex-1 truncate font-medium")}>{course.name}</span>
          <Caption as="span" tone="muted" className={clsx("tabular-nums")}>{percentDone(progress?.get(course.id))}%</Caption>
        </RowLink>
      ))}
    </Rows>
  );
}

export function PinnedCoursesWidget({ widget, courses }: Readonly<WidgetProps>) {
  const pinned = courses.filter((course) => course.bookmarked).slice(0, rowsFor(widget.size));
  if (pinned.length === 0) return <WidgetNote>Pin a course from its menu to keep it here.</WidgetNote>;
  return <CourseRows courses={pinned} />;
}

export function RecentCoursesWidget({ widget, courses }: Readonly<WidgetProps>) {
  const activity = useWidgetData(getCourseActivity, "activity");
  if (!activity) return null;
  const lastSeen = (course: Course) => activity.get(course.id) ?? course.updated_at;
  const recent = [...courses].sort((left, right) => lastSeen(right).localeCompare(lastSeen(left))).slice(0, rowsFor(widget.size));
  if (recent.length === 0) return <WidgetNote>Your courses show up here.</WidgetNote>;
  return <CourseRows courses={recent} />;
}

export function PageTypesWidget({ widget }: Readonly<WidgetProps>) {
  const courseId = Number(widget.config.courseId) || undefined;
  const counts = useWidgetData(() => countPagesBy("type", courseId), String(courseId));
  if (!counts) return null;
  const rows = pageTypes.filter((type) => counts.get(type)).sort((left, right) => (counts.get(right) ?? 0) - (counts.get(left) ?? 0));
  if (rows.length === 0) return <WidgetNote>No pages yet.</WidgetNote>;
  const max = counts.get(rows[0]) ?? 1;
  return (
    <ul className={clsx("space-y-1.5 px-3")}>
      {rows.slice(0, widget.size === "large" ? 9 : 3).map((type) => (
        <li key={type} className={clsx("grid grid-cols-[1rem_6rem_minmax(0,1fr)_2rem] items-center gap-2 text-xs")}>
          <svg className={clsx("size-4 text-muted")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={typeGlyphs[type]} />
          </svg>
          <span className={clsx("truncate")}>{pageTypeLabels[type]}</span>
          <span className={clsx("h-1.5 overflow-hidden rounded-full bg-ink/10")}>
            <span style={{ width: `${((counts.get(type) ?? 0) / max) * 100}%` }} className={clsx("block h-full rounded-full bg-ink/60")} />
          </span>
          <span className={clsx("text-right tabular-nums text-muted")}>{counts.get(type)}</span>
        </li>
      ))}
    </ul>
  );
}

// Runs an action on the page opened last: the page opens and the action
// starts there (see AiActions' route state).
export function QuickActionsWidget({ widget }: Readonly<WidgetProps>) {
  const navigate = useNavigate();
  const data = useWidgetData(async () => {
    const [actions, connection, [page]] = await Promise.all([getActions(), getActionConnection(), getPages({}, "opened", 1)]);
    return { actions, connection, page };
  }, "quick-actions");
  if (!data) return null;
  if (!data.connection) return <WidgetNote>No agent connected yet. Add one in Agent chat to run actions.</WidgetNote>;
  const { page } = data;
  if (!page) return <WidgetNote>Open a page first; actions run on your last page.</WidgetNote>;
  const chosen = Array.isArray(widget.config.actionIds) ? (widget.config.actionIds as number[]) : [];
  const actions = (chosen.length ? data.actions.filter((action) => chosen.includes(action.id)) : data.actions).slice(0, widget.size === "large" ? 7 : 2);
  if (actions.length === 0) return <WidgetNote>No AI actions yet. Add them in Settings, AI.</WidgetNote>;
  return (
    <div className={clsx("flex h-full flex-col")}>
      <Rows>
        {actions.map((action) => (
          <li key={action.id}>
            <button type="button" onClick={() => navigate(pageLink(page), { state: { runActionId: action.id } })} className={clsx(rowLink, "w-full text-left")}>
              <span className={clsx("flex size-6 shrink-0 items-center justify-center text-muted")}>
                <ActionIcon icon={action.icon} />
              </span>
              <span className={clsx("min-w-0 flex-1 truncate")}>{action.name}</span>
            </button>
          </li>
        ))}
      </Rows>
      <Caption tone="muted" className={clsx("mt-auto truncate border-t border-ink/10 px-3 py-1.5")}>On {page.title}</Caption>
    </div>
  );
}

export function AiUsageWidget({ widget }: Readonly<WidgetProps>) {
  const days = Number(widget.config.days) || 7;
  const usage = useWidgetData(() => getAiUsage(days), String(days));
  if (!usage) return null;
  const details = [usage.tokens ? `${usage.tokens.toLocaleString()} tokens` : null, usage.cost === null ? null : `$${usage.cost.toFixed(2)}`].filter(Boolean).join(" · ");
  return <Stat value={usage.runs.toLocaleString()} label={usage.runs === 1 ? "agent run" : "agent runs"} detail={[`Last ${days} days`, details].filter(Boolean).join(" · ")} />;
}
