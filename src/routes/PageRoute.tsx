import { getPageAudio } from "@/features/audiobook/lib/page-audio/actions";
import type { PageAudio } from "@/features/audiobook/lib/page-audio/types";
import { updateCourse } from "@/features/courses/lib/course/actions";
import { useCourses } from "@/features/courses/lib/coursesState";
import { getModule } from "@/features/courses/lib/module/actions";
import { getPage, getPages, markPageOpened } from "@/features/courses/lib/page/actions";
import type { Page as PageRecord } from "@/features/courses/lib/page/types";
import PageDetailPage from "@/features/courses/pages/PageDetailPage";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function PageRoute() {
  const { courseId, pageId } = useParams();
  const { courses, save } = useCourses();
  const course = courses.find((item) => String(item.id) === courseId);
  const [page, setPage] = useState<PageRecord>();
  const [pageReady, setPageReady] = useState(false);
  const [moduleName, setModuleName] = useState<string>();
  const [modulePages, setModulePages] = useState<PageRecord[]>([]);
  const [pageAudio, setPageAudio] = useState<PageAudio | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!pageId) return;
    let active = true;
    void markPageOpened(Number(pageId)).catch(() => undefined);
    getPage(Number(pageId)).then((loaded) => {
      if (active) {
        setPage(loaded);
        setPageReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [pageId]);

  useEffect(() => {
    if (!pageId) return;
    let active = true;
    setPageAudio(null);
    getPageAudio(Number(pageId)).then((loaded) => {
      if (active) setPageAudio(loaded);
    });
    return () => {
      active = false;
    };
  }, [pageId]);

  useEffect(() => {
    if (!page) return;
    let active = true;
    getModule(page.module_id).then((loaded) => {
      if (active) setModuleName(loaded?.name);
    });
    getPages(page.module_id)
      .then((loaded) => active && setModulePages(loaded))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [page?.module_id]);

  function savePage(saved: PageRecord) {
    setPage(saved);
    setModulePages((current) => current.map((item) => (item.id === saved.id ? saved : item)));
  }

  return (
    <PageDetailPage
      key={page?.id}
      course={course}
      page={page}
      modulePages={modulePages}
      pageReady={pageReady}
      moduleName={moduleName}
      onSavePage={savePage}
      pageAudio={pageAudio}
      onChangePageAudio={setPageAudio}
      onChangeCourseProfile={async (id) => {
        if (course) save(await updateCourse(course.id, { ai_profile_id: id }));
      }}
      onDeletePage={() =>
        navigate(`/courses/${courseId}/modules/${page?.module_id}`, { replace: true })
      }
    />
  );
}
