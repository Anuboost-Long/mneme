import type { Course } from "@/features/courses/lib/course/types";
import FindTasksDialog from "@/features/tasks/components/FindTasksDialog";
import TaskCheck from "@/features/tasks/components/TaskCheck";
import TaskForm from "@/features/tasks/components/TaskForm";
import { completeTask, deleteTask } from "@/features/tasks/lib/task/actions";
import {
  dueLabel,
  localDay,
  taskGroup,
  taskGroupLabels,
  taskTypeLabels,
  type Task,
  type TaskGroup
} from "@/features/tasks/lib/task/types";
import { errorMessage } from "@/shared/lib/errorMessage";
import ConfirmDeleteDialog from "@/shared/ui/ConfirmDeleteDialog";
import { rowAction } from "@/shared/ui/rowAction";
import Select from "@/shared/ui/Select";
import { BodyText, Caption, PageTitle, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useState } from "react";
import { Link } from "react-router-dom";

const openGroups: TaskGroup[] = ["overdue", "today", "week", "later", "undated"];

type Dialog = { kind: "new" } | { kind: "edit"; task: Task } | { kind: "delete"; task: Task };

function TaskItem({
  task,
  today,
  busy,
  onToggle,
  onEdit,
  onDelete
}: Readonly<{
  task: Task;
  today: string;
  busy: boolean;
  onToggle: (done: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}>) {
  const done = task.completed_at !== null;
  const overdue = !done && task.due_on !== null && task.due_on < today;
  const where = [task.course_name, task.module_name].filter(Boolean).join(" › ");
  return (
    <li className={clsx("flex items-start gap-3 py-3")}>
      <span className={clsx("pt-0.5")}>
        <TaskCheck title={task.title} done={done} disabled={busy} onChange={onToggle} />
      </span>
      <div className={clsx("min-w-0 flex-1")}>
        <p className={clsx("text-sm font-medium wrap-anywhere", done && "text-muted line-through")}>
          {task.title}
        </p>
        <Caption tone="muted" className={clsx("mt-1 flex flex-wrap gap-x-3 gap-y-1")}>
          <span>{taskTypeLabels[task.type]}</span>
          {task.due_on && (
            <span className={clsx(overdue && "font-medium text-danger")}>
              {dueLabel(task.due_on, today)}
            </span>
          )}
          {where && <span className={clsx("max-w-full truncate")}>{where}</span>}
          {task.page_id && task.page_title && task.course_id && task.module_id && (
            <Link
              to={`/courses/${task.course_id}/modules/${task.module_id}/pages/${task.page_id}`}
              className={clsx(
                "max-w-full truncate hover:text-ink hover:underline underline-offset-4"
              )}
            >
              {task.page_title}
            </Link>
          )}
        </Caption>
      </div>
      <div className={clsx("flex shrink-0 gap-1")}>
        <button type="button" onClick={onEdit} className={rowAction("edit")}>
          Edit
        </button>
        <button type="button" onClick={onDelete} className={rowAction("danger")}>
          Delete
        </button>
      </div>
    </li>
  );
}

export default function TasksPage({
  courses,
  tasks,
  ready,
  reload
}: Readonly<{ courses: Course[]; tasks: Task[]; ready: boolean; reload: () => Promise<void> }>) {
  const [courseFilter, setCourseFilter] = useState(0);
  const [dialog, setDialog] = useState<Dialog>({ kind: "new" });
  const [open, setOpen] = useState(false);
  const [finding, setFinding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const today = localDay();
  const visible = courseFilter ? tasks.filter((task) => task.course_id === courseFilter) : tasks;
  const grouped = new Map<TaskGroup, Task[]>();
  for (const task of visible) {
    const group = taskGroup(task, today);
    grouped.set(group, [...(grouped.get(group) ?? []), task]);
  }
  const done = [...(grouped.get("done") ?? [])].sort((a, b) =>
    (b.completed_at ?? "").localeCompare(a.completed_at ?? "")
  );
  const openCount = visible.length - done.length;
  const overdueCount = grouped.get("overdue")?.length ?? 0;
  const weekCount = (grouped.get("today")?.length ?? 0) + (grouped.get("week")?.length ?? 0);

  function show(next: Dialog) {
    setDialog(next);
    setOpen(true);
  }

  async function toggle(task: Task, isDone: boolean) {
    setBusyId(task.id);
    setError("");
    try {
      await completeTask(task.id, isDone);
      await reload();
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t update this task. Try again."));
    } finally {
      setBusyId(null);
    }
  }

  const item = (task: Task) => (
    <TaskItem
      key={task.id}
      task={task}
      today={today}
      busy={busyId === task.id}
      onToggle={(isDone) => void toggle(task, isDone)}
      onEdit={() => show({ kind: "edit", task })}
      onDelete={() => show({ kind: "delete", task })}
    />
  );

  return (
    <div className={clsx("w-full px-4 py-5 sm:px-6")}>
      <div className={clsx("flex flex-wrap items-end justify-between gap-4")}>
        <div className={clsx("min-w-0")}>
          <PageTitle>Tasks</PageTitle>
          <BodyText tone="muted" className={clsx("mt-1")}>
            {openCount === 0
              ? "Nothing to do. Imported exercises, discussions and assignments show up here, and so can your own."
              : [
                  overdueCount > 0 && `${overdueCount} overdue`,
                  weekCount > 0 && `${weekCount} due this week`,
                  `${openCount} to do`
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </BodyText>
        </div>
        <div className={clsx("flex gap-2")}>
          {courses.length > 0 && (
            <button
              type="button"
              onClick={() => setFinding(true)}
              className={clsx(
                "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
                "hover:bg-ink/5"
              )}
            >
              Find tasks
            </button>
          )}
          <button
            type="button"
            onClick={() => show({ kind: "new" })}
            className={clsx(
              "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
              "hover:bg-action/85"
            )}
          >
            New task
          </button>
        </div>
      </div>
      {courses.length > 0 && tasks.length > 0 && (
        <div className={clsx("mt-5 w-full sm:w-64")}>
          <Select
            label="Course"
            compact
            value={courseFilter}
            onChange={setCourseFilter}
            options={[
              { value: 0, label: "All courses" },
              ...courses.map((course) => ({ value: course.id, label: course.name }))
            ]}
          />
        </div>
      )}
      {error && (
        <BodyText role="alert" tone="error" className={clsx("mt-4")}>
          {error}
        </BodyText>
      )}
      {!ready && (
        <BodyText role="status" tone="muted" className={clsx("mt-6")}>
          Loading tasks…
        </BodyText>
      )}
      {ready && visible.length === 0 && (
        <div className={clsx("mt-6 border-t border-ink/10 py-16 text-center sm:py-24")}>
          <SectionTitle>No tasks yet</SectionTitle>
          <BodyText tone="muted" className={clsx("mx-auto mt-2 max-w-sm")}>
            Find tasks looks through a module’s pages for work to do, or add one of your own with
            New task.
          </BodyText>
        </div>
      )}
      {ready && visible.length > 0 && (
        <div className={clsx("mt-6 space-y-6")}>
          {openGroups.map((group) => {
            const items = grouped.get(group);
            if (!items?.length) return null;
            return (
              <section key={group} aria-labelledby={`tasks-${group}`}>
                <Caption
                  as="h2"
                  id={`tasks-${group}`}
                  tone="muted"
                  className={clsx(
                    "border-b border-ink/10 pb-2 font-medium",
                    group === "overdue" && "text-danger"
                  )}
                >
                  {taskGroupLabels[group]} · {items.length}
                </Caption>
                <ul className={clsx("divide-y divide-ink/10")}>{items.map(item)}</ul>
              </section>
            );
          })}
          {done.length > 0 && (
            <details className={clsx("group")}>
              <summary
                className={clsx(
                  "cursor-pointer border-b border-ink/10 pb-2 text-xs font-medium text-muted",
                  "hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
                )}
              >
                Done · {done.length}
              </summary>
              <ul className={clsx("divide-y divide-ink/10")}>{done.map(item)}</ul>
            </details>
          )}
        </div>
      )}
      <FindTasksDialog
        open={finding}
        courses={courses}
        courseId={courseFilter || undefined}
        onAdded={() => void reload()}
        onClose={() => setFinding(false)}
      />
      <TaskForm
        open={open && dialog.kind !== "delete"}
        task={dialog.kind === "edit" ? dialog.task : null}
        courses={courses}
        courseId={courseFilter || undefined}
        onSaved={() => void reload()}
        onClose={() => setOpen(false)}
      />
      <ConfirmDeleteDialog
        open={open && dialog.kind === "delete"}
        title="Delete this task?"
        message={dialog.kind === "delete" ? `“${dialog.task.title}” is deleted for good.` : ""}
        confirmLabel="Delete task"
        failure="Couldn’t delete this task. Try again."
        onConfirm={() =>
          dialog.kind === "delete" ? deleteTask(dialog.task.id) : Promise.resolve()
        }
        onClose={() => setOpen(false)}
        onDeleted={() => {
          setOpen(false);
          void reload();
        }}
      />
    </div>
  );
}
