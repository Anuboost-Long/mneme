import clsx from "clsx";
import { Link } from "react-router-dom";
import { BodyText, Caption, PageTitle, SectionTitle, Typography } from "../../../shared/ui/Typography";
import CourseIcon from "../../../shared/ui/CourseIcon";
import CourseActions from "../components/CourseActions";
import type { Course } from "../lib/courses";

export default function CoursesPage({ courses, onCreate, onSave, onDelete }: Readonly<{
  courses: Course[];
  onCreate: () => void;
  onSave: (course: Course) => void;
  onDelete: (id: number) => void;
}>) {
  return (
    <div className={clsx("px-4 py-5 sm:px-6")}>
      <div className={clsx("flex flex-wrap items-start justify-between gap-5")}>
        <div>
          <PageTitle>Your courses</PageTitle>
          <BodyText tone="muted" className={clsx("mt-3")}>A place for everything you’re learning.</BodyText>
        </div>
        <button type="button" onClick={onCreate} className={clsx("flex items-center gap-2 rounded-md bg-action px-4 py-2.5 text-sm font-medium text-on-action", "hover:bg-action/85")}><span aria-hidden="true">+</span> New course</button>
      </div>
      {courses.length === 0 ? (
        <section className={clsx("mt-12 border-y border-ink/10 py-16 sm:py-24")}>
          <CourseIcon large />
          <SectionTitle className={clsx("mt-6")}>Start with what you’re studying</SectionTitle>
          <BodyText tone="muted" className={clsx("mt-3 max-w-md")}>A university subject, a new skill, a lifelong curiosity. Create your first course and give it a home.</BodyText>
          <button type="button" onClick={onCreate} className={clsx("mt-6 rounded-md border border-ink/20 px-4 py-2.5 text-sm font-medium", "hover:bg-ink/5")}>Create your first course</button>
        </section>
      ) : (
        <section aria-label="All courses" className={clsx("mt-6")}>
          <div className={clsx("flex items-center justify-between border-b border-ink/15 pb-3")}><Caption as="span" tone="muted">{courses.length} {courses.length === 1 ? "course" : "courses"}</Caption><Caption as="span" tone="muted">Creation order</Caption></div>
          <ul>
            {courses.map((course) => (
              <li key={course.id} className={clsx("border-b border-ink/10")}>
                <CourseActions course={course} onSave={onSave} onDelete={onDelete}>
                  <Link to={`/courses/${course.id}`} className={clsx("group flex items-center gap-4 rounded-md py-5 pr-12 pl-3", "hover:bg-ink/5")}>
                    <CourseIcon icon={course.icon} color={course.color} />
                    <div className={clsx("min-w-0 flex-1")}>
                      <Typography as="h2" variant="itemTitle" className={clsx("truncate")}>{course.name}</Typography>
                      {course.description && <BodyText tone="muted" className={clsx("mt-1 truncate")}>{course.description}</BodyText>}
                    </div>
                  </Link>
                </CourseActions>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
