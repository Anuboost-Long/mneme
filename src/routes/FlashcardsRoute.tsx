import { useCourses } from "@/features/courses/lib/coursesState";
import { useDeck } from "@/features/flashcards/lib/useDeck";
import FlashcardsPage from "@/features/flashcards/pages/FlashcardsPage";
import { useParams } from "react-router-dom";

export default function FlashcardsRoute() {
  const { courseId, moduleId } = useParams();
  const { courses } = useCourses();
  const deck = useDeck(Number(moduleId));
  return <FlashcardsPage course={courses.find((item) => String(item.id) === courseId)} {...deck} />;
}
