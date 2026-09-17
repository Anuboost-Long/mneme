import CoursesPage from "../features/courses/pages/CoursesPage";
import { useCourses } from "../layouts/RootLayout";

export default function CoursesRoute() {
  const { courses, create, save, remove } = useCourses();
  return <CoursesPage courses={courses} onCreate={create} onSave={save} onDelete={remove} />;
}
