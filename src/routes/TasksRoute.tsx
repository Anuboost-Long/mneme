import { useCourses } from "@/features/courses/lib/coursesState";
import { useTasks } from "@/features/tasks/lib/useTasks";
import TasksPage from "@/features/tasks/pages/TasksPage";

export default function TasksRoute() {
  const { courses } = useCourses();
  return <TasksPage courses={courses} {...useTasks()} />;
}
