import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CoursePage from "../features/courses/pages/CoursePage";
import { getModules, reorderModules, type Module } from "../features/courses/lib/modules";
import type { PageProgress } from "../features/courses/lib/page/types";
import { getModulePageProgress } from "../features/courses/lib/page/table";
import { useCourses } from "../features/courses/lib/coursesState";

export default function CourseRoute() {
  const { courseId } = useParams();
  const { courses, save, remove } = useCourses();
  const course = courses.find((item) => String(item.id) === courseId);
  const [modules, setModules] = useState<Module[]>([]);
  const [modulesReady, setModulesReady] = useState(false);
  const [pageProgress, setPageProgress] = useState<Map<number, PageProgress>>(new Map());
  const navigate = useNavigate();

  useEffect(() => {
    if (!course) return;
    let active = true;
    setModulesReady(false);
    getModules(course.id).then((loaded) => { if (active) { setModules(loaded); setModulesReady(true); } });
    getModulePageProgress(course.id).then((loaded) => { if (active) setPageProgress(loaded); });
    return () => { active = false; };
  }, [course?.id]);

  function saveModule(module: Module) {
    setModules((current) => current.some((item) => item.id === module.id)
      ? current.map((item) => item.id === module.id ? module : item)
      : [...current, module]);
  }

  function removeModule(id: number) {
    setModules((current) => current.filter((item) => item.id !== id));
  }

  // Shows the new order right away and puts the old one back if saving fails.
  function reorder(next: Module[]) {
    const previous = modules;
    setModules(next.map((module, index) => ({ ...module, position: index + 1 })));
    reorderModules(next.map((module) => module.id)).catch(() => setModules(previous));
  }

  return (
    <CoursePage
      course={course}
      modules={modules}
      modulesReady={modulesReady}
      pageProgress={pageProgress}
      onSaveCourse={save}
      onDeleteCourse={(id) => { remove(id); navigate("/courses", { replace: true }); }}
      onSaveModule={saveModule}
      onDeleteModule={removeModule}
      onReorderModules={reorder}
    />
  );
}
