import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { useCourses } from "@/features/courses/lib/coursesState";
import { getModule } from "@/features/courses/lib/module/actions";
import type { Module } from "@/features/courses/lib/module/types";
import { getQuestions, getQuiz } from "@/features/quizzes/lib/quiz/actions";
import type { Question, Quiz } from "@/features/quizzes/lib/quiz/types";
import QuizPage from "@/features/quizzes/pages/QuizPage";

export default function QuizRoute() {
  const { courseId, moduleId, quizId } = useParams();
  const { courses } = useCourses();
  const [module, setModule] = useState<Module>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    Promise.all([getModule(Number(moduleId)), getQuiz(Number(quizId)), getQuestions(Number(quizId))])
      .then(([loadedModule, loadedQuiz, loadedQuestions]) => {
        if (!active) return;
        setModule(loadedModule);
        setQuiz(loadedQuiz?.module_id === Number(moduleId) ? loadedQuiz : null);
        setQuestions(loadedQuestions);
        setReady(true);
      })
      .catch(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, [moduleId, quizId]);

  return (
    <QuizPage
      key={quizId}
      course={courses.find((item) => String(item.id) === courseId)}
      module={module}
      quiz={quiz}
      questions={questions}
      ready={ready}
    />
  );
}
