import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { BodyText, PageTitle, Typography } from "../../../shared/ui/Typography";
import CourseIcon from "../../../shared/ui/CourseIcon";
import GalleryCard from "../components/GalleryCard";
import CourseForm from "../components/CourseForm";
import DeleteCourse from "../components/DeleteCourse";
import ModuleForm, { moduleStatusLabels } from "../components/ModuleForm";
import DeleteModule from "../components/DeleteModule";
import type { Course } from "../lib/courses";
import type { Module } from "../lib/modules";

export default function CoursePage({ course, modules, modulesReady, onSaveCourse, onDeleteCourse, onSaveModule, onDeleteModule }: Readonly<{
  course: Course | undefined;
  modules: Module[];
  modulesReady: boolean;
  onSaveCourse: (course: Course) => void;
  onDeleteCourse: (id: number) => void;
  onSaveModule: (module: Module) => void;
  onDeleteModule: (id: number) => void;
}>) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [moduleDialog, setModuleDialog] = useState<{ type: "edit" | "delete"; module: Module } | "create" | null>(null);

  if (!course) return (
    <section className={clsx("p-8 sm:p-14")}>
      <PageTitle>Course not found</PageTitle>
      <BodyText tone="muted" className={clsx("mt-3")}>This course may have been deleted. Choose another course from the sidebar.</BodyText>
      <Link to="/courses" className={clsx("mt-6 inline-block text-sm underline underline-offset-4")}>Back to all courses</Link>
    </section>
  );

  return (
    <div className={clsx("px-4 py-5 sm:px-6")}>
      <Link to="/courses" className={clsx("inline-flex items-center gap-2 rounded-md", "border border-ink/15", "px-3 py-2 text-sm font-medium", "hover:bg-ink/5")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14" /></svg>
        Back to courses
      </Link>
      <div className={clsx("mt-6 flex flex-wrap items-start justify-between gap-4")}>
        <div className={clsx("flex min-w-0 grow basis-64 items-center gap-4")}>
          <CourseIcon icon={course.icon} color={course.color} />
          <PageTitle className={clsx("min-w-0 wrap-anywhere")}>{course.name}</PageTitle>
        </div>
        <div className={clsx("flex gap-2")}>
          <button type="button" onClick={() => setDialog("edit")} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}>Edit course</button>
          <button type="button" onClick={() => setDialog("delete")} className={clsx("rounded-md px-3 py-2 text-sm text-muted", "hover:bg-danger/10 hover:text-danger")}>Delete</button>
        </div>
      </div>
      {course.description && <BodyText tone="muted" className={clsx("mt-3 whitespace-pre-wrap wrap-anywhere")}>{course.description}</BodyText>}
      <section aria-label="Modules" className={clsx("@container mt-6 border-t border-ink/10 pt-5")}>
        <div className={clsx("flex items-center justify-between gap-4")}>
          <Typography as="h2" variant="label">Modules</Typography>
          <button type="button" onClick={() => setModuleDialog("create")} disabled={!modulesReady} className={clsx("flex items-center gap-2 text-sm text-muted", "hover:text-ink")}>
            <span aria-hidden="true" className={clsx("text-lg leading-none")}>+</span> New module
          </button>
        </div>
        {modules.length === 0 ? (
          <div className={clsx("py-16 text-center sm:py-24")}>
            <svg className={clsx("mx-auto size-10 text-ink/25")} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="7" y="5" width="26" height="30" rx="3" /><path d="M14 14h12M14 20h12M14 26h7" /></svg>
            <Typography as="h3" variant="itemTitle" className={clsx("mt-5")}>Room for what comes next</Typography>
            <BodyText tone="muted" className={clsx("mx-auto mt-2 max-w-xs")}>Your modules and learning material will live here.</BodyText>
          </div>
        ) : (
          <ul className={clsx("mt-5 grid grid-cols-1 gap-4 @min-lg:grid-cols-2 @min-3xl:grid-cols-3")}>
            {modules.map((module) => (
              <GalleryCard key={module.id} title={module.name} badge={moduleStatusLabels[module.status]} description={module.description || ""} color={course.color} to={`/courses/${course.id}/modules/${module.id}`} openLabel="Open module" onEdit={() => setModuleDialog({ type: "edit", module })} onDelete={() => setModuleDialog({ type: "delete", module })} />
            ))}
          </ul>
        )}
      </section>
      {dialog === "edit" && <CourseForm key={course.id} course={course} onClose={() => setDialog(null)} onSave={(updated) => { onSaveCourse(updated); setDialog(null); }} />}
      {dialog === "delete" && <DeleteCourse course={course} onClose={() => setDialog(null)} onDelete={() => { onDeleteCourse(course.id); setDialog(null); }} />}
      {moduleDialog === "create" && <ModuleForm courseId={course.id} onClose={() => setModuleDialog(null)} onSave={(module) => { onSaveModule(module); setModuleDialog(null); }} />}
      {moduleDialog && moduleDialog !== "create" && moduleDialog.type === "edit" && <ModuleForm key={moduleDialog.module.id} courseId={course.id} module={moduleDialog.module} onClose={() => setModuleDialog(null)} onSave={(module) => { onSaveModule(module); setModuleDialog(null); }} />}
      {moduleDialog && moduleDialog !== "create" && moduleDialog.type === "delete" && <DeleteModule module={moduleDialog.module} onClose={() => setModuleDialog(null)} onDelete={() => { onDeleteModule(moduleDialog.module.id); setModuleDialog(null); }} />}
    </div>
  );
}
