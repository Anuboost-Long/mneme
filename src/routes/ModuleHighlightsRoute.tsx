import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ModuleHighlightsPage from "../features/courses/pages/ModuleHighlightsPage";
import { getModule, type Module as ModuleRecord } from "../features/courses/lib/modules";
import { getPages, type Page as PageRecord } from "../features/courses/lib/pages";
import { getModuleHighlights, type Highlight } from "../features/courses/lib/highlights";
import { useCourses } from "../features/courses/lib/coursesState";

export default function ModuleHighlightsRoute() {
  const { courseId, moduleId } = useParams();
  const { courses } = useCourses();
  const course = courses.find((item) => String(item.id) === courseId);
  const [module, setModule] = useState<ModuleRecord>();
  const [moduleReady, setModuleReady] = useState(false);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightsReady, setHighlightsReady] = useState(false);

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
    setHighlightsReady(false);
    Promise.all([getPages(module.id), getModuleHighlights(module.id)]).then(([loadedPages, loadedHighlights]) => {
      if (active) { setPages(loadedPages); setHighlights(loadedHighlights); setHighlightsReady(true); }
    });
    return () => { active = false; };
  }, [module?.id]);

  return (
    <ModuleHighlightsPage
      course={course}
      module={module}
      moduleReady={moduleReady}
      pages={pages}
      highlights={highlights}
      highlightsReady={highlightsReady}
      onRemoveHighlight={(id) => setHighlights((current) => current.filter((item) => item.id !== id))}
      onKeepHighlight={(id) => setHighlights((current) => current.map((item) => item.id === id ? { ...item, orphaned_at: null } : item))}
    />
  );
}
