import { useParams } from "react-router-dom";

import { useCourses } from "../features/courses/lib/coursesState";
import { useDeck } from "../features/flashcards/lib/useDeck";
import FlashcardReviewPage from "../features/flashcards/pages/FlashcardReviewPage";

export default function FlashcardReviewRoute() {
  const { courseId, moduleId } = useParams();
  const { courses } = useCourses();
  const { module, cards, ready } = useDeck(Number(moduleId));
  return (
    <FlashcardReviewPage
      course={courses.find((item) => String(item.id) === courseId)}
      module={module}
      cards={cards}
      ready={ready}
    />
  );
}
