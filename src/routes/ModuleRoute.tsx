import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ModulePage from "../features/courses/pages/ModulePage";
import { getModule, type Module as ModuleRecord } from "../features/courses/lib/modules";
import type { Page as PageRecord } from "../features/courses/lib/page/types";
import { useCourses } from "../features/courses/lib/coursesState";
import { getPages, reorderPages } from "../features/courses/lib/page/actions";

export default function ModuleRoute() {
  const { courseId, moduleId } = useParams();
  const { courses } = useCourses();
  const course = courses.find((item) => String(item.id) === courseId);
  const [module, setModule] = useState<ModuleRecord>();
  const [moduleReady, setModuleReady] = useState(false);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [pagesReady, setPagesReady] = useState(false);
  const [pagesVersion, setPagesVersion] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!moduleId) return;
    let active = true;
    setModuleReady(false);
    getModule(Number(moduleId)).then((loaded) => { if (active) { setModule(loaded); setModuleReady(true); } });
    return () => { active = false; };
  }, [moduleId]);

  useEffect(() => {
    if (!module) return;
    let active = true;
    setPagesReady(false);
    getPages(module.id).then((loaded) => { if (active) { setPages(loaded); setPagesReady(true); } });
    return () => { active = false; };
  }, [module?.id, pagesVersion]);

  function savePage(page: PageRecord) {
    setPages((current) => current.some((item) => item.id === page.id)
      ? current.map((item) => item.id === page.id ? page : item)
      : [...current, page]);
  }

  function removePage(id: number) {
    setPages((current) => current.filter((item) => item.id !== id));
  }

  // Shows the new order right away and puts the old one back if saving fails.
  function reorder(next: PageRecord[]) {
    const previous = pages;
    setPages(next.map((page, index) => ({ ...page, position: index + 1 })));
    reorderPages(next.map((page) => page.id)).catch(() => setPages(previous));
  }

  return (
    <ModulePage
      course={course}
      module={module}
      moduleReady={moduleReady}
      pages={pages}
      pagesReady={pagesReady}
      onSaveModule={setModule}
      onDeleteModule={() => navigate(`/courses/${courseId}`, { replace: true })}
      onSavePage={savePage}
      onDeletePage={removePage}
      onReorderPages={reorder}
      onPagesChanged={() => setPagesVersion((version) => version + 1)}
    />
  );
}
