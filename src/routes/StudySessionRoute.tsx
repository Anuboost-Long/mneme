import { useCourses } from "@/features/courses/lib/coursesState";
import { useStudySession } from "@/features/study/lib/useStudySession";
import StudySessionPage from "@/features/study/pages/StudySessionPage";
import { useParams } from "react-router-dom";

export default function StudySessionRoute() {
  const { courseId, moduleId, sessionId } = useParams();
  const { courses } = useCourses();
  return (
    <StudySessionPage
      key={sessionId}
      course={courses.find((item) => String(item.id) === courseId)}
      {...useStudySession(Number(moduleId), Number(sessionId))}
    />
  );
}
