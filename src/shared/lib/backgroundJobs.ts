import { useSyncExternalStore } from "react";

export type JobAction = { label: string; path: string };

export type Job = {
  id: number;
  // Lets a screen pick out its own jobs, e.g. "quizzes:5".
  scope: string;
  title: string;
  detail: string;
  // 0–1, or null while there's nothing to measure yet.
  progress: number | null;
  status: "running" | "done" | "failed";
  action?: JobAction;
};

let jobs: Job[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function set(id: number, patch: Partial<Job>) {
  jobs = jobs.map((job) => (job.id === id ? { ...job, ...patch } : job));
  listeners.forEach((listener) => listener());
}

// Work that keeps going while the user moves around the app. The tray in
// the app shell shows it and pops up when it ends.
export function startJob(scope: string, title: string, detail: string) {
  const id = nextId++;
  jobs = [...jobs, { id, scope, title, detail, progress: null, status: "running" }];
  listeners.forEach((listener) => listener());
  return {
    update: (detail: string, progress: number | null) => set(id, { detail, progress }),
    finish: (title: string, detail: string, action?: JobAction) =>
      set(id, { title, detail, action, progress: 1, status: "done" }),
    fail: (title: string, detail: string) => set(id, { title, detail, status: "failed" })
  };
}

export function dismissJob(id: number) {
  jobs = jobs.filter((job) => job.id !== id);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useJobs() {
  return useSyncExternalStore(subscribe, () => jobs);
}
