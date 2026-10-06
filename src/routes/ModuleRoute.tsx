import { useCourses } from "@/features/courses/lib/coursesState";
import { getModule, getModules } from "@/features/courses/lib/module/actions";
import type { Module as ModuleRecord } from "@/features/courses/lib/module/types";
import { getPages, reorderPages } from "@/features/courses/lib/page/actions";
import type { Page as PageRecord } from "@/features/courses/lib/page/types";
import ModulePage from "@/features/courses/pages/ModulePage";
import { getModulePrep } from "@/features/prepare/lib/prep/actions";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function ModuleRoute() {
  const { courseId, moduleId } = useParams();
  const { courses } = useCourses();
  const course = courses.find((item) => String(item.id) === courseId);
  const [module, setModule] = useState<ModuleRecord>();
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [moduleReady, setModuleReady] = useState(false);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [pagesReady, setPagesReady] = useState(false);
  const [pagesVersion, setPagesVersion] = useState(0);
  const [summaryPageId, setSummaryPageId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!moduleId) return;
    let active = true;
    getModule(Number(moduleId)).then((loaded) => {
      if (active) {
        setModule(loaded);
        setModuleReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [moduleId]);

  useEffect(() => {
    if (!course) return;
    let active = true;
    getModules(course.id)
      .then((loaded) => active && setModules(loaded))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [course?.id]);

  useEffect(() => {
    if (!module) return;
    let active = true;
    setPagesReady(false);
    getPages(module.id).then((loaded) => {
      if (active) {
        setPages(loaded);
        setPagesReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [module?.id, pagesVersion]);

  useEffect(() => {
    if (!module) return;
    let active = true;
    getModulePrep(module.id)
      .then((prep) => active && setSummaryPageId(prep?.summary_page_id ?? null))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [module?.id]);

  function saveModule(saved: ModuleRecord) {
    setModule(saved);
    setModules((current) => current.map((item) => (item.id === saved.id ? saved : item)));
  }

  function savePage(page: PageRecord) {
    setPages((current) =>
      current.some((item) => item.id === page.id)
        ? current.map((item) => (item.id === page.id ? page : item))
        : [...current, page]
    );
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
      key={module?.id}
      course={course}
      module={module}
      modules={modules}
      moduleReady={moduleReady}
      pages={pages}
      pagesReady={pagesReady}
      summaryPageId={summaryPageId}
      onSaveModule={saveModule}
      onDeleteModule={() => navigate(`/courses/${courseId}`, { replace: true })}
      onSavePage={savePage}
      onDeletePage={removePage}
      onReorderPages={reorder}
      onPagesChanged={() => setPagesVersion((version) => version + 1)}
    />
  );
}
