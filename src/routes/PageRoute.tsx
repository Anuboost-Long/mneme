import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageDetailPage from "../features/courses/pages/PageDetailPage";
import { getModule } from "../features/courses/lib/modules";
import { getPage, type Page as PageRecord } from "../features/courses/lib/pages";
import { useCourses } from "../layouts/RootLayout";

export default function PageRoute() {
  const { courseId, pageId } = useParams();
  const { courses } = useCourses();
  const course = courses.find((item) => String(item.id) === courseId);
  const [page, setPage] = useState<PageRecord>();
  const [pageReady, setPageReady] = useState(false);
  const [moduleName, setModuleName] = useState<string>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!pageId) return;
    let active = true;
    setPageReady(false);
    getPage(Number(pageId)).then((loaded) => { if (active) { setPage(loaded); setPageReady(true); } });
    return () => { active = false; };
  }, [pageId]);

  useEffect(() => {
    if (!page) return;
    let active = true;
    getModule(page.module_id).then((loaded) => { if (active) setModuleName(loaded?.name); });
    return () => { active = false; };
  }, [page?.module_id]);

  return (
    <PageDetailPage
      course={course}
      page={page}
      pageReady={pageReady}
      moduleName={moduleName}
      onSavePage={setPage}
      onDeletePage={() => navigate(`/courses/${courseId}/modules/${page?.module_id}`, { replace: true })}
    />
  );
}
