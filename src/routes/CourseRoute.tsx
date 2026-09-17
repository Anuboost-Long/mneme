import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CoursePage from "../features/courses/pages/CoursePage";
import { getModules, type Module } from "../features/courses/lib/modules";
import { useCourses } from "../layouts/RootLayout";

export default function CourseRoute() {
  const { courseId } = useParams();
  const { courses, save, remove } = useCourses();
  const course = courses.find((item) => String(item.id) === courseId);
  const [modules, setModules] = useState<Module[]>([]);
  const [modulesReady, setModulesReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!course) return;
    let active = true;
    setModulesReady(false);
    getModules(course.id).then((loaded) => { if (active) { setModules(loaded); setModulesReady(true); } });
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

  return (
    <CoursePage
      course={course}
      modules={modules}
      modulesReady={modulesReady}
      onSaveCourse={save}
      onDeleteCourse={(id) => { remove(id); navigate("/courses", { replace: true }); }}
      onSaveModule={saveModule}
      onDeleteModule={removeModule}
    />
  );
}
