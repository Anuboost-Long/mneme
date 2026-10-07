import AgentSelect from "@/features/agent-chat/components/AgentSelect";
import { useAgentChoice } from "@/features/agent-chat/lib/useAgentChoice";
import type { Course } from "@/features/courses/lib/course/types";
import { getModules } from "@/features/courses/lib/module/actions";
import type { Module } from "@/features/courses/lib/module/types";
import {
  addFoundTasks,
  findModuleTasks,
  findModuleTasksWithAi,
  newCandidates,
  type TaskCandidate
} from "@/features/tasks/lib/findTasks";
import { dueLabel, localDay, taskTypeLabels } from "@/features/tasks/lib/task/types";
import { useResetOnOpen } from "@/shared/lib/dialogState";
import { errorMessage } from "@/shared/lib/errorMessage";
import Dialog from "@/shared/ui/Dialog";
import Select from "@/shared/ui/Select";
import { BodyText, Caption } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useRef, useState, type SubmitEvent } from "react";

type Row = TaskCandidate & { picked: boolean };

export default function FindTasksDialog({
  open,
  courses,
  courseId,
  moduleId,
  onAdded,
  onClose
}: Readonly<{
  open: boolean;
  courses: Course[];
  courseId?: number;
  moduleId?: number;
  onAdded: (count: number) => void;
  onClose: () => void;
}>) {
  const [course, setCourse] = useState(0);
  const [module, setModule] = useState(0);
  const shownModule = useRef(0);
  shownModule.current = module;
  const [modules, setModules] = useState<Module[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const latestRows = useRef(rows);
  latestRows.current = rows;
  const [existing, setExisting] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [askedAi, setAskedAi] = useState(false);
  const [aiAdded, setAiAdded] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const agent = useAgentChoice(open);
  const today = localDay();
  const picked = rows?.filter((row) => row.picked) ?? [];

  useResetOnOpen(open, () => {
    setCourse(courseId ?? courses[0]?.id ?? 0);
    setModule(moduleId ?? 0);
    setRows(null);
    setAskedAi(false);
    setBusy(false);
    setError("");
  });

  useEffect(() => {
    if (!open || !course) return;
    let active = true;
    void getModules(course).then((loaded) => {
      if (!active) return;
      setModules(loaded);
      setModule((current) =>
        loaded.some((item) => item.id === current) ? current : (loaded[0]?.id ?? 0)
      );
    });
    return () => {
      active = false;
    };
  }, [open, course]);

  useEffect(() => {
    if (!open || !module) return;
    let active = true;
    setRows(null);
    setAskedAi(false);
    setError("");
    findModuleTasks(module)
      .then((found) => {
        if (!active) return;
        setRows(found.candidates.map((candidate) => ({ ...candidate, picked: true })));
        setExisting(found.existing);
      })
      .catch(
        (error_) =>
          active && setError(errorMessage(error_, "Couldn’t read this module’s pages. Try again."))
      );
    return () => {
      active = false;
    };
  }, [open, module]);

  function chooseCourse(value: number) {
    setCourse(value);
    setModule(0);
    setRows(null);
  }

  function toggle(index: number) {
    setRows(
      (current) =>
        current?.map((row, rowIndex) =>
          rowIndex === index ? { ...row, picked: !row.picked } : row
        ) ?? null
    );
  }

  async function askAi() {
    const asked = module;
    setAsking(true);
    setError("");
    try {
      const found = await findModuleTasksWithAi(asked, rows ?? [], agent.connectionId);
      if (asked !== shownModule.current) return;
      const known = latestRows.current ?? [];
      const added = newCandidates(found, [...existing, ...known.map((row) => row.title)]);
      setRows([...known, ...added.map((candidate) => ({ ...candidate, picked: true }))]);
      setAiAdded(added.length);
      setAskedAi(true);
    } catch (error_) {
      setError(errorMessage(error_, "The agent couldn’t look through this module. Try again."));
    } finally {
      setAsking(false);
    }
  }

  async function add(
    event: SubmitEvent<HTMLFormElement>,
    complete: (callback: () => void) => void
  ) {
    event.preventDefault();
    if (!picked.length) return;
    setBusy(true);
    setError("");
    try {
      await addFoundTasks(picked, course, module);
      complete(() => {
        onAdded(picked.length);
        onClose();
      });
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t add these tasks. Try again."));
      setBusy(false);
    }
  }

  let addLabel = "Add tasks";
  if (picked.length === 1) addLabel = "Add 1 task";
  else if (picked.length > 1) addLabel = `Add ${picked.length} tasks`;

  let status = "";
  if (!module) status = course && !modules.length ? "This course has no modules yet." : "";
  else if (rows === null && !error) status = "Reading the module’s pages…";
  else if (rows?.length === 0)
    status = askedAi
      ? "Neither the rules nor the agent found anything new to do in this module."
      : "No new tasks found in this module’s pages. Ask AI to look too, or add one with New task.";

  return (
    <Dialog open={open} title="Find tasks" onClose={onClose} busy={busy || asking} wide>
      {(close, complete) => (
        <form onSubmit={(event) => void add(event, complete)} className={clsx("space-y-5")}>
          <BodyText tone="muted">
            Looks through every page in a module for assignments, quizzes, discussions and
            exercises. Untick anything you don’t want.
          </BodyText>
          <div className={clsx("grid gap-5 sm:grid-cols-2")}>
            <Select
              label="Course"
              value={course}
              onChange={chooseCourse}
              options={courses.map((item) => ({ value: item.id, label: item.name }))}
            />
            <Select
              label="Module"
              value={module}
              onChange={setModule}
              disabled={!modules.length}
              options={
                modules.length
                  ? modules.map((item) => ({ value: item.id, label: item.name }))
                  : [{ value: 0, label: "No modules" }]
              }
            />
          </div>
          {status && (
            <BodyText role="status" tone="muted">
              {status}
            </BodyText>
          )}
          {rows && rows.length > 0 && (
            <fieldset className={clsx("min-w-0 space-y-2")}>
              <legend
                className={clsx(
                  "flex w-full items-baseline justify-between gap-3 text-sm font-medium"
                )}
              >
                Found {rows.length} {rows.length === 1 ? "task" : "tasks"}
              </legend>
              <ul
                className={clsx(
                  "max-h-80 divide-y divide-ink/10 overflow-y-auto rounded-md border border-ink/15"
                )}
              >
                {rows.map((row, index) => (
                  <li key={`${row.page.id}-${row.title}`}>
                    <label
                      className={clsx("flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm")}
                    >
                      <input
                        type="checkbox"
                        checked={row.picked}
                        onChange={() => toggle(index)}
                        className={clsx("mt-0.5 accent-current")}
                      />
                      <span className={clsx("min-w-0 flex-1 font-medium wrap-anywhere")}>
                        {row.title}
                        <Caption
                          as="span"
                          tone="muted"
                          className={clsx("mt-0.5 flex flex-wrap gap-x-3 font-normal")}
                        >
                          <span>{taskTypeLabels[row.type]}</span>
                          {row.due_on && <span>{dueLabel(row.due_on, today)}</span>}
                          <span className={clsx("max-w-full truncate")}>From {row.page.title}</span>
                          {row.byAi && <span>Found by AI</span>}
                        </Caption>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
          {askedAi && rows !== null && rows.length > 0 && (
            <Caption tone="muted" className={clsx("block")}>
              {aiAdded
                ? `The agent found ${aiAdded} more, marked Found by AI.`
                : "The agent didn’t find anything else."}
            </Caption>
          )}
          {existing.length > 0 && rows !== null && (
            <Caption tone="muted" className={clsx("block")}>
              {existing.length} already in your tasks, so not listed.
            </Caption>
          )}
          {error && (
            <BodyText role="alert" tone="error">
              {error}
            </BodyText>
          )}
          <div
            className={clsx(
              "flex flex-wrap items-end justify-between gap-3 border-t border-ink/10 pt-5"
            )}
          >
            <div className={clsx("flex flex-wrap items-end gap-2")}>
              {!askedAi && <AgentSelect choice={agent} disabled={asking} className={clsx("w-40")} />}
              <button
                type="button"
                disabled={
                  !module || rows === null || asking || askedAi || busy || agent.connectionId === null
                }
                onClick={() => void askAi()}
                className={clsx(
                  "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
                  "hover:bg-ink/5 disabled:opacity-50"
                )}
              >
                {asking ? "Asking AI…" : "Ask AI to look too"}
              </button>
            </div>
            <div className={clsx("flex gap-3")}>
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
                disabled={busy || asking || !picked.length}
                className={clsx(
                  "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                  "hover:bg-action/85 disabled:opacity-50"
                )}
              >
                {addLabel}
              </button>
            </div>
          </div>
        </form>
      )}
    </Dialog>
  );
}
