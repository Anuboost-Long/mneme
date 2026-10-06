import type { Course } from "@/features/courses/lib/course/types";
import { getModules } from "@/features/courses/lib/module/actions";
import type { Module } from "@/features/courses/lib/module/types";
import { addTasks, editTask } from "@/features/tasks/lib/task/actions";
import { TaskType, taskTypeOptions, type Task } from "@/features/tasks/lib/task/types";
import { useResetOnOpen } from "@/shared/lib/dialogState";
import { errorMessage } from "@/shared/lib/errorMessage";
import DateField from "@/shared/ui/date/DateField";
import Dialog from "@/shared/ui/Dialog";
import { TextInput } from "@/shared/ui/Input";
import Select from "@/shared/ui/Select";
import { BodyText } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState, type SubmitEvent } from "react";

export default function TaskForm({
  open,
  task,
  courses,
  courseId,
  onSaved,
  onClose
}: Readonly<{
  open: boolean;
  task: Task | null;
  courses: Course[];
  courseId: number | undefined;
  onSaved: () => void;
  onClose: () => void;
}>) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState(TaskType.Personal);
  const [course, setCourse] = useState(0);
  const [module, setModule] = useState(0);
  const [dueOn, setDueOn] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useResetOnOpen(open, () => {
    setTitle(task?.title ?? "");
    setType(task?.type ?? TaskType.Personal);
    setCourse(task ? (task.course_id ?? 0) : (courseId ?? 0));
    setModule(task?.module_id ?? 0);
    setDueOn(task?.due_on ?? null);
    setBusy(false);
    setError("");
  });

  useEffect(() => {
    if (!course) {
      setModules([]);
      return;
    }
    let active = true;
    void getModules(course).then((loaded) => {
      if (active) setModules(loaded);
    });
    return () => {
      active = false;
    };
  }, [course]);

  function chooseCourse(value: number) {
    setCourse(value);
    setModule(0);
  }

  async function save(
    event: SubmitEvent<HTMLFormElement>,
    complete: (callback: () => void) => void
  ) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const draft = {
      title,
      type,
      course_id: course || null,
      module_id: module || null,
      due_on: dueOn
    };
    try {
      if (task) await editTask(task.id, draft);
      else await addTasks([draft]);
      complete(() => {
        onSaved();
        onClose();
      });
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t save this task. Try again."));
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} title={task ? "Edit task" : "New task"} onClose={onClose} busy={busy}>
      {(close, complete) => (
        <form onSubmit={(event) => void save(event, complete)} className={clsx("space-y-5")}>
          <TextInput
            label="Task"
            required
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Assignment 1: Risk report"
          />
          <div className={clsx("grid gap-5 sm:grid-cols-2")}>
            <Select label="Type" value={type} onChange={setType} options={taskTypeOptions} />
            <DateField label="Due date" value={dueOn} onChange={setDueOn} />
          </div>
          <div className={clsx("grid gap-5 sm:grid-cols-2")}>
            <Select
              label="Course"
              value={course}
              onChange={chooseCourse}
              options={[
                { value: 0, label: "No course" },
                ...courses.map((item) => ({ value: item.id, label: item.name }))
              ]}
            />
            <Select
              label="Module"
              value={module}
              onChange={setModule}
              disabled={!course}
              options={[
                { value: 0, label: "No module" },
                ...modules.map((item) => ({ value: item.id, label: item.name }))
              ]}
            />
          </div>
          {error && (
            <BodyText role="alert" tone="error">
              {error}
            </BodyText>
          )}
          <div className={clsx("flex justify-end gap-3 border-t border-ink/10 pt-5")}>
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className={clsx(
                "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
                "hover:bg-ink/5"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={clsx(
                "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                "hover:bg-action/85"
              )}
            >
              {task ? "Save task" : "Add task"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
