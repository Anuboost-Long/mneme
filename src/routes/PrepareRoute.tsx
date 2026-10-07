import { useCourses } from "@/features/courses/lib/coursesState";
import { usePrepare } from "@/features/prepare/lib/usePrepare";
import PreparePage from "@/features/prepare/pages/PreparePage";
import { useParams } from "react-router-dom";

export default function PrepareRoute() {
  const { courseId, moduleId } = useParams();
  const { courses } = useCourses();
  return (
    <PreparePage
      courses={courses}
      course={courses.find((item) => String(item.id) === courseId)}
      {...usePrepare(Number(moduleId))}
    />
  );
}
