import { dismissJob, useJobs, type Job } from "@/shared/lib/backgroundJobs";
import { Caption } from "@/shared/ui/Typography";
import clsx from "clsx";
import { Link } from "react-router-dom";

function DismissButton({ job }: Readonly<{ job: Job }>) {
  return (
    <button
      type="button"
      onClick={() => dismissJob(job.id)}
      aria-label={`Dismiss ${job.title}`}
      title="Dismiss"
      className={clsx(
        "-mt-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-md text-muted",
        "hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
      )}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

function JobCard({ job }: Readonly<{ job: Job }>) {
  return (
    <li className={clsx("rounded-lg border border-ink/15 bg-surface p-3 shadow-lg")}>
      <div className={clsx("flex items-start gap-3")}>
        <div className={clsx("min-w-0 flex-1")}>
          <p
            className={clsx(
              "text-sm font-medium wrap-anywhere",
              job.status === "failed" && "text-danger"
            )}
          >
            {job.title}
          </p>
          <Caption tone="muted" className={clsx("mt-0.5 block wrap-anywhere")}>
            {job.detail}
          </Caption>
        </div>
        {job.status !== "running" && <DismissButton job={job} />}
      </div>
      {job.status === "running" && (
        <progress
          aria-label={job.title}
          max={1}
          value={job.progress ?? undefined}
          className={clsx("import-progress mt-3 block h-1.5 w-full")}
        />
      )}
      {job.status === "running" && job.stop && (
        <button
          type="button"
          onClick={job.stop}
          className={clsx(
            "mt-3 rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium",
            "hover:bg-ink/5"
          )}
        >
          Stop
        </button>
      )}
      {job.status === "done" && job.action && (
        <Link
          to={job.action.path}
          onClick={() => dismissJob(job.id)}
          className={clsx(
            "mt-3 inline-block rounded-md bg-action px-3 py-1.5 text-sm font-medium text-on-action",
            "hover:bg-action/85"
          )}
        >
          {job.action.label}
        </Link>
      )}
    </li>
  );
}

// Background work (quizzes, flashcards) while it runs, and a pop-up when
// it's ready or has failed.
export default function JobsTray() {
  const jobs = useJobs();
  return (
    <section
      aria-label="Background tasks"
      aria-live="polite"
      className={clsx(
        "pointer-events-none fixed right-4 bottom-4 z-50 w-80 max-w-[calc(100vw-2rem)]"
      )}
    >
      {jobs.length > 0 && (
        <ul className={clsx("pointer-events-auto flex flex-col gap-2")}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </ul>
      )}
    </section>
  );
}
