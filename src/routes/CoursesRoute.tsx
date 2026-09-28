import { useEffect, useState } from "react";
import CoursesPage from "../features/courses/pages/CoursesPage";
import { getModuleCounts } from "../features/courses/lib/modules";
import { getCoursePageProgress, type PageProgress } from "../features/courses/lib/pages";
import { useCourses } from "../layouts/RootLayout";

export default function CoursesRoute() {
  const { courses, create, save, remove } = useCourses();
  const [moduleCounts, setModuleCounts] = useState<Map<number, number>>(new Map());
  const [pageProgress, setPageProgress] = useState<Map<number, PageProgress>>(new Map());

  useEffect(() => {
    let active = true;
    getModuleCounts().then((loaded) => { if (active) setModuleCounts(loaded); });
    getCoursePageProgress().then((loaded) => { if (active) setPageProgress(loaded); });
    return () => { active = false; };
  }, []);

  return <CoursesPage courses={courses} moduleCounts={moduleCounts} pageProgress={pageProgress} onCreate={create} onSave={save} onDelete={remove} />;
}
