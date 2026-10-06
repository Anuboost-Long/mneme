import { useCourses } from "@/features/courses/lib/coursesState";
import { useStudySessions } from "@/features/study/lib/useStudySessions";
import StudyPage from "@/features/study/pages/StudyPage";
import { useParams } from "react-router-dom";

export default function StudyRoute() {
  const { courseId, moduleId } = useParams();
  const { courses } = useCourses();
  return (
    <StudyPage
      course={courses.find((item) => String(item.id) === courseId)}
      {...useStudySessions(Number(moduleId))}
    />
  );
}
