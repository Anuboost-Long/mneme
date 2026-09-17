import HomePage from "../features/home/pages/HomePage";
import { useCourses } from "../layouts/RootLayout";

export default function HomeRoute() {
  const { courses, create } = useCourses();
  return <HomePage courses={courses} onCreate={create} />;
}
