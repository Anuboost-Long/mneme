import { useWidgetData } from "@/features/home/lib/useWidgetData";
import TaskCheck from "@/features/tasks/components/TaskCheck";
import { completeTask, getTasks } from "@/features/tasks/lib/task/actions";
import { dueLabel, localDay } from "@/features/tasks/lib/task/types";
import { Caption } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Rows, rowsFor, WidgetNote } from "./parts";
import type { WidgetProps } from "./types";

export function TasksWidget({ widget }: Readonly<WidgetProps>) {
  const courseId = Number(widget.config.courseId) || undefined;
  const limit = rowsFor(widget.size);
  const [version, setVersion] = useState(0);
  const tasks = useWidgetData(
    async () => (await getTasks({ courseId, open: true })).slice(0, limit),
    `${courseId}-${limit}-${version}`
  );
  if (!tasks) return null;
  if (tasks.length === 0)
    return (
      <WidgetNote>Nothing to do. Imported activities and your own tasks show up here.</WidgetNote>
    );
  const today = localDay();
  const narrow = widget.size === "small";

  async function finish(id: number) {
    await completeTask(id, true);
    setVersion((current) => current + 1);
  }

  return (
    <Rows>
      {tasks.map((task) => {
        const overdue = task.due_on !== null && task.due_on < today;
        return (
          <li key={task.id} className={clsx("flex h-9 items-center gap-3 pl-3")}>
            <TaskCheck title={task.title} done={false} onChange={() => void finish(task.id)} />
            <Link
              to="/tasks"
              className={clsx(
                "flex h-full min-w-0 flex-1 items-center gap-3 pr-3 text-sm",
                "hover:bg-ink/4 focus-visible:bg-ink/4 focus-visible:outline-none"
              )}
            >
              <span className={clsx("min-w-0 flex-1 truncate font-medium")}>{task.title}</span>
              {!narrow && task.due_on && (
                <Caption
                  as="span"
                  tone="muted"
                  className={clsx("shrink-0", overdue && "font-medium text-danger")}
                >
                  {dueLabel(task.due_on, today)}
                </Caption>
              )}
            </Link>
          </li>
        );
      })}
    </Rows>
  );
}
