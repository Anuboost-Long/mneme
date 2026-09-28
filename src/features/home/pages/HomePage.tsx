import { Link } from "react-router-dom";
import clsx from "clsx";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import CourseIcon from "../../../shared/ui/CourseIcon";
import type { Course } from "../../courses/lib/courses";
import { percentDone, type PageProgress } from "../../courses/lib/pages";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function ProgressLine({ progress }: Readonly<{ progress: number }>) {
  return (
    <progress value={progress} max={100} aria-label="Progress" className={clsx(
      "block h-1 w-full appearance-none overflow-hidden rounded-full bg-ink/10",
      "[&::-webkit-progress-bar]:bg-ink/10 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-chain-lime [&::-moz-progress-bar]:bg-chain-lime",
    )} />
  );
}

export default function HomePage({ courses, pageProgress, onCreate }: Readonly<{
  courses: Course[];
  pageProgress: Map<number, PageProgress>;
  onCreate: () => void;
}>) {
  const [current, ...others] = [...courses].sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  const currentProgress = percentDone(current && pageProgress.get(current.id));

  return (
    <div className={clsx("min-h-0 flex-1 px-4 py-5 sm:px-6")}>
      <p className={clsx("text-lg text-muted")}>{greeting()} 👋</p>

      {current ? <>
        <section aria-labelledby="continue-heading" className={clsx("mt-3")}>
          <h1 id="continue-heading" className={clsx("text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl")}>
            Back to {current.name}?
          </h1>
          {current.description && <BodyText tone="muted" className={clsx("mt-4 max-w-xl text-base leading-7")}>{current.description}</BodyText>}
          <div className={clsx("mt-8 flex flex-wrap items-center gap-x-6 gap-y-4")}>
            <Link to={`/courses/${current.id}`} className={clsx("inline-flex h-11 items-center gap-3 rounded-md bg-chain-lime pr-5 pl-2 text-sm font-semibold text-chain-navy", "hover:bg-chain-lime/85", "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-chain-lime")}>
              <span className={clsx("flex size-7 items-center justify-center rounded bg-chain-navy/10")}><svg className={clsx("size-3.5")} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3.5v9l7-4.5-7-4.5Z" /></svg></span>
              {currentProgress > 0 ? "Continue course" : "Start course"}
            </Link>
            {currentProgress > 0 && <div className={clsx("flex min-w-40 flex-1 items-center gap-3")}><div className={clsx("flex-1")}><ProgressLine progress={currentProgress} /></div><Caption tone="muted">{currentProgress}% done</Caption></div>}
          </div>
        </section>

        {others.length > 0 && <section aria-labelledby="shelf-heading" className={clsx("mt-12")}>
          <div className={clsx("flex items-baseline justify-between gap-4 border-b border-ink/10 pb-3")}>
            <h2 id="shelf-heading" className={clsx("text-sm font-medium")}>Your other courses</h2>
            <button type="button" onClick={onCreate} className={clsx("text-sm text-muted underline-offset-4", "hover:text-ink hover:underline")}>New course</button>
          </div>
          <ul className={clsx("divide-y divide-ink/10")}>
            {others.slice(0, 5).map((course) => <li key={course.id}>
              <Link to={`/courses/${course.id}`} className={clsx("-mx-3 flex items-center gap-4 rounded-md px-3 py-4", "hover:bg-ink/4 focus-visible:bg-ink/4")}>
                <CourseIcon icon={course.icon} color={course.color} />
                <span className={clsx("min-w-0 flex-1 truncate text-sm font-medium")}>{course.name}</span>
                <span className={clsx("hidden w-28 sm:block")}><ProgressLine progress={percentDone(pageProgress.get(course.id))} /></span>
                <Caption tone="muted" className={clsx("w-10 text-right tabular-nums")}>{percentDone(pageProgress.get(course.id))}%</Caption>
              </Link>
            </li>)}
          </ul>
        </section>}
      </> : (
        <section className={clsx("mt-3")}>
          <h1 className={clsx("text-4xl leading-tight font-semibold tracking-tight sm:text-5xl")}>What do you want to learn?</h1>
          <BodyText tone="muted" className={clsx("mt-4 max-w-xl text-base leading-7")}>Make a course for a subject you’re studying, then bring in pages, PDFs, and notes as you go.</BodyText>
          <button type="button" onClick={onCreate} className={clsx("mt-8 h-11 rounded-md bg-chain-lime px-5 text-sm font-semibold text-chain-navy", "hover:bg-chain-lime/85", "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-chain-lime")}>Create a course</button>
        </section>
      )}
    </div>
  );
}
