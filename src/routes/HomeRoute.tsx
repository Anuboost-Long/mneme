import { useEffect, useState } from "react";
import HomePage from "../features/home/pages/HomePage";
import { getCoursePageProgress, type PageProgress } from "../features/courses/lib/pages";
import { useCourses } from "../layouts/RootLayout";

export default function HomeRoute() {
  const { courses, create } = useCourses();
  const [pageProgress, setPageProgress] = useState<Map<number, PageProgress>>(new Map());

  useEffect(() => {
    let active = true;
    getCoursePageProgress().then((loaded) => { if (active) setPageProgress(loaded); });
    return () => { active = false; };
  }, []);

  return <HomePage courses={courses} pageProgress={pageProgress} onCreate={create} />;
}
