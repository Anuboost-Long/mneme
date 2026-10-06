import { useParams } from "react-router-dom";

import { useCourses } from "@/features/courses/lib/coursesState";
import { useModuleQuizzes } from "@/features/quizzes/lib/useModuleQuizzes";
import QuizzesPage from "@/features/quizzes/pages/QuizzesPage";

export default function QuizzesRoute() {
  const { courseId, moduleId } = useParams();
  const { courses } = useCourses();
  return <QuizzesPage course={courses.find((item) => String(item.id) === courseId)} {...useModuleQuizzes(Number(moduleId))} />;
}
