import { Link } from "react-router-dom";
import clsx from "clsx";
import { BodyText, Caption, PageTitle, SectionTitle } from "../../../shared/ui/Typography";
import CourseIcon from "../../../shared/ui/CourseIcon";
import { CompletionStatus, completionStatusLabels } from "../../courses/lib/completion-status";
import type { Course } from "../../courses/lib/courses";

export default function HomePage({ courses, onCreate }: Readonly<{
  courses: Course[];
  onCreate: () => void;
}>) {
  const recentCourses = [...courses].sort((left, right) => right.updated_at.localeCompare(left.updated_at)).slice(0, 3);
  const activeCourses = courses.filter((course) => course.status === CompletionStatus.InProgress).length;

  return (
    <div className={clsx("min-h-0 flex-1 px-4 py-5 sm:px-6 sm:py-12")}>
      <div className={clsx("mx-auto w-full max-w-5xl")}>
        <header className={clsx("flex flex-wrap items-end justify-between gap-5 border-b border-ink/15 pb-6 sm:pb-8")}>
          <div>
            <PageTitle>Home</PageTitle>
            <BodyText tone="muted" className={clsx("mt-2")}>Your learning workspace, organized around what to pick up next.</BodyText>
          </div>
          <div className={clsx("flex flex-wrap gap-3")}>
            <Link to="/settings" className={clsx("inline-flex h-10 items-center rounded-md px-3 text-sm text-muted", "hover:bg-ink/5 hover:text-ink focus-visible:bg-ink/5 focus-visible:text-ink")}>Settings</Link>
            <Link to="/agent-chat" className={clsx("inline-flex h-10 items-center rounded-md border border-ink/20 px-3 text-sm", "hover:bg-ink/5 focus-visible:bg-ink/5")}>Chat</Link>
            <button type="button" onClick={onCreate} className={clsx("inline-flex h-10 items-center rounded-md bg-action px-4 text-sm font-medium text-on-action", "hover:bg-action/85")}>New course</button>
          </div>
        </header>

        {courses.length === 0 ? (
          <section className={clsx("py-16 sm:py-24")}>
            <CourseIcon large />
            <SectionTitle className={clsx("mt-6")}>Start with what you’re studying</SectionTitle>
            <BodyText tone="muted" className={clsx("mt-3 max-w-md")}>Create a course for a subject, skill, or curiosity. It will become the place to collect and build on your work.</BodyText>
            <button type="button" onClick={onCreate} className={clsx("mt-6 h-10 rounded-md border border-ink/20 px-4 text-sm font-medium", "hover:bg-ink/5")}>Create your first course</button>
          </section>
        ) : <section aria-label="Your courses" className={clsx("pt-6 sm:pt-8")}>
          <div className={clsx("flex flex-wrap items-baseline justify-between gap-4")}>
            <div>
              <SectionTitle>Continue learning</SectionTitle>
              <Caption tone="muted" className={clsx("mt-1")}>{courses.length} {courses.length === 1 ? "course" : "courses"}{activeCourses > 0 && ` · ${activeCourses} in progress`}</Caption>
            </div>
            <Link to="/courses" className={clsx("text-sm text-muted underline-offset-4", "hover:text-ink hover:underline")}>All courses</Link>
          </div>
          <ul className={clsx("mt-5 grid grid-flow-col auto-cols-full gap-px overflow-x-auto rounded-md border border-ink/15 bg-ink/15", "sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 lg:grid-cols-3")}>
            {recentCourses.map((course) => <li key={course.id} className={clsx("min-w-0 bg-surface")}>
              <Link to={`/courses/${course.id}`} className={clsx("group flex h-full min-h-48 flex-col p-4 sm:min-h-52 sm:p-5", "hover:bg-ink/5 focus-visible:bg-ink/5")}>
                <div className={clsx("flex items-start justify-between gap-4")}>
                  <CourseIcon icon={course.icon} color={course.color} />
                  <Caption tone="muted">{completionStatusLabels[course.status]}</Caption>
                </div>
                <div className={clsx("mt-6 min-w-0 flex-1 sm:mt-8")}>
                  <span className={clsx("block truncate text-base font-medium")} title={course.name}>{course.name}</span>
                  <span className={clsx("mt-2 block line-clamp-2 text-sm leading-6 text-muted")}>{course.description || "Open course"}</span>
                </div>
                <div className={clsx("mt-6")}>
                  <div className={clsx("flex items-center justify-between gap-3")}>
                    <Caption tone="muted">Progress</Caption>
                    <Caption>{course.progress}%</Caption>
                  </div>
                  <div className={clsx("mt-2 h-1 overflow-hidden rounded-full bg-ink/10")}><div className={clsx("h-full bg-action")} style={{ width: `${course.progress}%` }} /></div>
                </div>
              </Link>
            </li>)}
          </ul>
        </section>}
      </div>
    </div>
  );
}
