import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { BodyText, Caption, PageTitle, SectionTitle } from "../../../shared/ui/Typography";
import CourseIcon from "../../../shared/ui/CourseIcon";
import type { Course } from "../../courses/lib/courses";

export default function HomePage({ courses, onCreate }: Readonly<{
  courses: Course[];
  onCreate: () => void;
}>) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function update() {
      setNow(new Date());
      clearTimeout(timer);
      timer = setTimeout(update, 60_000 - Date.now() % 60_000);
    }
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).formatToParts(now);
  const shortcutClass = clsx("inline-flex items-center justify-center gap-2 rounded-md px-3 py-2.5", "border border-ink/15 text-sm", "hover:bg-sidebar focus-visible:bg-sidebar");

  const recentCourses = courses.slice(-3).reverse();

  return (
    <div className={clsx("flex min-h-0 flex-1 flex-col px-4 py-5 sm:px-6")}>
      <PageTitle className={clsx("sr-only")}>Home</PageTitle>
      <div className={clsx("mx-auto grid w-full max-w-4xl flex-1 content-center items-center gap-8", courses.length > 0 && "md:grid-cols-2 md:gap-12")}>
        <section aria-label="Your learning workspace" className={clsx("flex min-w-0 flex-col items-center")}>
          <time dateTime={now.toISOString()} className={clsx("flex items-baseline justify-center gap-3")}>
            <span className={clsx("text-6xl font-medium tracking-tight tabular-nums sm:text-7xl lg:text-8xl")}>
              {time.filter((part) => part.type !== "dayPeriod").map((part) => part.value).join("").trim()}
            </span>
            {time.some((part) => part.type === "dayPeriod") && <span className={clsx("text-xl font-medium text-muted")}>{time.find((part) => part.type === "dayPeriod")?.value}</span>}
          </time>
          <BodyText tone="muted" className={clsx("mt-3 text-center")}>
            {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </BodyText>
          <nav aria-label="Home shortcuts" className={clsx("mt-7 flex flex-wrap justify-center gap-2")}>
            <Link to="/courses" className={shortcutClass}>
              <svg className={clsx("size-4 text-muted")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 4h7v7H3zM14 4h7v7h-7zM3 15h7v6H3zM14 15h7v6h-7z" /></svg>
              All courses
            </Link>
            <button type="button" onClick={onCreate} className={clsx("inline-flex items-center justify-center gap-2 rounded-md px-3 py-2.5", "bg-action text-sm text-on-action", "hover:bg-action/85")}>
              <svg className={clsx("size-4")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              New course
            </button>
            <Link to="/settings" className={shortcutClass}>
              <svg className={clsx("size-4 text-muted")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" fill="var(--surface)" /><circle cx="15" cy="17" r="3" fill="var(--surface)" /></svg>
              Settings
            </Link>
          </nav>
        </section>
        {courses.length > 0 ? (
          <section aria-label="Your courses" className={clsx("w-full min-w-0 border-t border-ink/15 pt-5 md:border-t-0 md:border-l md:py-3 md:pl-10")}>
            <div className={clsx("flex items-baseline justify-between gap-4 border-b border-ink/15 pb-3")}>
              <SectionTitle>Your courses</SectionTitle>
              <Link to="/courses" className={clsx("shrink-0 text-sm text-muted underline-offset-4", "hover:text-ink hover:underline")}>View all ({courses.length})</Link>
            </div>
            <ul>
              {recentCourses.map((course) => (
                <li key={course.id} className={clsx("border-b border-ink/10")}>
                  <Link to={`/courses/${course.id}`} className={clsx("group flex min-w-0 items-center gap-3 rounded-md px-2 py-3", "hover:bg-ink/5 focus-visible:bg-ink/5")}>
                    <CourseIcon icon={course.icon} color={course.color} />
                    <span className={clsx("min-w-0 flex-1")}>
                      <span className={clsx("block truncate text-sm font-medium")} title={course.name}>{course.name}</span>
                      <span className={clsx("mt-1 block truncate text-xs text-muted")}>
                        {course.description || "Open course"}
                      </span>
                    </span>
                    <span aria-hidden="true" className={clsx("shrink-0 text-lg text-muted", "group-hover:text-ink")}>↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <Caption tone="muted" className={clsx("text-center")}>Start with a course. Make room for what you want to learn.</Caption>
        )}
      </div>
    </div>
  );
}
