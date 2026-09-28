import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { BodyText, PageTitle, Typography } from "../../../shared/ui/Typography";
import CourseIcon from "../../../shared/ui/CourseIcon";
import ChapterRow from "../components/ChapterRow";
import ProgressSummary from "../components/ProgressSummary";
import CourseForm from "../components/CourseForm";
import DeleteCourse from "../components/DeleteCourse";
import ModuleForm, { moduleStatusLabels } from "../components/ModuleForm";
import DeleteModule from "../components/DeleteModule";
import ListToolbar from "../../../shared/ui/ListToolbar";
import { useListView, type SortOption } from "../../../shared/lib/useListView";
import { useStoredChoice } from "../../../shared/lib/useStoredChoice";
import { DATE_GROUP_VALUES, groupByDate } from "../../../shared/lib/dateGroups";
import type { Course } from "../lib/courses";
import type { PageProgress } from "../lib/pages";
import { ModuleStatus, moduleStatuses, updateModule, type Module } from "../lib/modules";
import { errorMessage } from "../../../shared/lib/errorMessage";

type ModuleSortKey = "oldest" | "newest" | "name" | "status";

const MODULE_SORTS: SortOption<Module, ModuleSortKey>[] = [
  { value: "oldest", label: "Oldest first", compare: (a, b) => a.created_at.localeCompare(b.created_at) },
  { value: "newest", label: "Newest first", compare: (a, b) => b.created_at.localeCompare(a.created_at) },
  { value: "name", label: "Name (A–Z)", compare: (a, b) => a.name.localeCompare(b.name) },
  { value: "status", label: "Status", compare: (a, b) => moduleStatusLabels[a.status].localeCompare(moduleStatusLabels[b.status]) },
];

export default function CoursePage({ course, modules, modulesReady, pageProgress, onSaveCourse, onDeleteCourse, onSaveModule, onDeleteModule }: Readonly<{
  course: Course | undefined;
  modules: Module[];
  modulesReady: boolean;
  pageProgress: Map<number, PageProgress>;
  onSaveCourse: (course: Course) => void;
  onDeleteCourse: (id: number) => void;
  onSaveModule: (module: Module) => void;
  onDeleteModule: (id: number) => void;
}>) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [moduleDialog, setModuleDialog] = useState<{ type: "edit" | "delete"; module: Module } | "create" | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useStoredChoice("mneme.modules.group", DATE_GROUP_VALUES, "none");

  const statusFilteredModules = useMemo(
    () => (statusFilter === "all" ? modules : modules.filter((module) => String(module.status) === statusFilter)),
    [modules, statusFilter],
  );
  const matchesModuleQuery = (module: Module, query: string) => module.name.toLowerCase().includes(query);
  const { query, setQuery, sortValue, setSortValue, visible: visibleModules } = useListView(statusFilteredModules, matchesModuleQuery, MODULE_SORTS, "mneme.modules.sort");
  const moduleNumbers = new Map(modules.map((module, index) => [module.id, index + 1]));
  const coursePages = [...pageProgress.values()].reduce((sum, progress) => ({ total: sum.total + progress.total, done: sum.done + progress.done }), { total: 0, done: 0 });
  const upNextId = modules.find((module) => module.status !== ModuleStatus.Completed)?.id;
  const inCourseOrder = sortValue === "oldest" && groupBy === "none";
  const moduleGroups = useMemo(() => groupByDate(visibleModules, (module) => module.created_at, groupBy, sortValue === "oldest" ? "oldest" : "newest"), [visibleModules, groupBy, sortValue]);

  function changeStatus(module: Module, status: ModuleStatus) {
    setStatusError(null);
    updateModule(module.id, { status }).then(onSaveModule).catch((error) => setStatusError(errorMessage(error, "Couldn’t change this module’s status. Try again.")));
  }

  if (!course) return (
    <section className={clsx("p-8 sm:p-14")}>
      <PageTitle>Course not found</PageTitle>
      <BodyText tone="muted" className={clsx("mt-3")}>This course may have been deleted. Choose another course from the sidebar.</BodyText>
      <Link to="/courses" className={clsx("mt-6 inline-block text-sm underline underline-offset-4")}>Back to all courses</Link>
    </section>
  );

  return (
    <div className={clsx("px-4 py-5 sm:px-6")}>
      <Link to="/courses" className={clsx("-ml-2 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted", "hover:bg-ink/5 hover:text-ink")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14" /></svg>
        Back to courses
      </Link>
      <div className={clsx("mt-4 flex flex-wrap items-start justify-between gap-4")}>
        <div className={clsx("flex min-w-0 grow basis-64 items-center gap-5")}>
          <CourseIcon icon={course.icon} color={course.color} large />
          <PageTitle className={clsx("min-w-0 text-4xl wrap-anywhere")}>{course.name}</PageTitle>
        </div>
        <div className={clsx("flex gap-2")}>
          <button type="button" onClick={() => setDialog("edit")} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}>Edit course</button>
          <button type="button" onClick={() => setDialog("delete")} className={clsx("rounded-md px-3 py-2 text-sm text-muted", "hover:bg-danger/10 hover:text-danger")}>Delete</button>
        </div>
      </div>
      {course.description && <BodyText tone="muted" className={clsx("mt-4 max-w-2xl text-base leading-7 whitespace-pre-wrap wrap-anywhere")}>{course.description}</BodyText>}
      {coursePages.total > 0 && <ProgressSummary done={coursePages.done} total={coursePages.total} noun="pages" className={clsx("mt-6")} />}
      <section aria-label="Modules" className={clsx("@container mt-6 border-t border-ink/10 pt-5")}>
        <div className={clsx("flex items-center justify-between gap-4")}>
          <Typography as="h2" variant="label">Modules</Typography>
          <button type="button" onClick={() => setModuleDialog("create")} disabled={!modulesReady} className={clsx("inline-flex h-9 shrink-0 items-center gap-2 rounded-md", "bg-action", "text-sm font-medium text-on-action", "px-3", "hover:opacity-85")}>
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
          <>
            <ListToolbar
              query={query} onQueryChange={setQuery} searchPlaceholder="Search modules…"
              filterLabel="Status" filterValue={statusFilter} onFilterChange={setStatusFilter}
              filterOptions={[{ value: "all", label: "All statuses" }, ...moduleStatuses.map((status) => ({ value: String(status), label: moduleStatusLabels[status] }))]}
              sortValue={sortValue} onSortChange={setSortValue} sortOptions={MODULE_SORTS}
              groupBy={groupBy} onGroupByChange={setGroupBy}
              className={clsx("mt-5")}
            />
            {visibleModules.length === 0 ? (
              <BodyText tone="muted" className={clsx("mt-8 text-center")}>No modules match your search or filter.</BodyText>
            ) : (
              <div className={clsx("mt-4 space-y-8")}>
                {statusError && <BodyText role="alert" tone="error">{statusError}</BodyText>}
                {moduleGroups.map((group) => (
                  <section key={group.key} aria-label={group.label || "Modules"}>
                    {group.label && <Typography as="p" variant="caption" tone="muted" className={clsx("mb-3 font-medium")}>{group.label}</Typography>}
                    <ol className={clsx("min-w-0")}>
                      {group.items.map((module) => (
                        <ChapterRow
                          key={module.id} module={module} number={moduleNumbers.get(module.id) ?? 0} progress={pageProgress.get(module.id)}
                          upNext={module.id === upNextId} rail={inCourseOrder} to={`/courses/${course.id}/modules/${module.id}`}
                          onStatusChange={(status) => changeStatus(module, status)}
                          onEdit={() => setModuleDialog({ type: "edit", module })} onDelete={() => setModuleDialog({ type: "delete", module })}
                        />
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            )}
          </>
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
