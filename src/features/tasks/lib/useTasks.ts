import { useCallback, useEffect, useState } from "react";

import { getTasks } from "./task/actions";
import type { Task, TaskFilter } from "./task/types";

export function useTasks(filter: TaskFilter = {}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const { courseId, open } = filter;

  const reload = useCallback(async () => {
    setTasks(await getTasks({ courseId, open }));
    setReady(true);
  }, [courseId, open]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tasks, ready, reload };
}
