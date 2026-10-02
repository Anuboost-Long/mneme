import { atom, useAtom, useSetAtom } from "jotai";

import { getCourses, reorderCourses } from "./course/actions";
import type { Course } from "./course/types";

export const coursesAtom = atom<Course[]>([]);
export const creatingCourseAtom = atom(false);

export function useCourses() {
  const [courses, setCourses] = useAtom(coursesAtom);
  const setCreating = useSetAtom(creatingCourseAtom);

  function save(course: Course) {
    setCourses((current) =>
      current.some((item) => item.id === course.id)
        ? current.map((item) => (item.id === course.id ? course : item))
        : [...current, course]
    );
  }

  function remove(id: number) {
    setCourses((current) => current.filter((course) => course.id !== id));
  }

  // Shows the new order right away and puts the old one back if saving fails.
  function reorder(next: Course[]) {
    const previous = courses;
    setCourses(next);
    reorderCourses(next.map((course) => course.id)).catch(() => setCourses(previous));
  }

  async function refresh() {
    setCourses(await getCourses());
  }

  return { courses, create: () => setCreating(true), save, remove, reorder, refresh };
}
