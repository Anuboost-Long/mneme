import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { BodyText, PageTitle, Typography } from "../../../shared/ui/Typography";
import PageForm, { pageTypeLabels } from "../components/PageForm";
import PageEditor from "../components/editor/PageEditor";
import DeletePage from "../components/DeletePage";
import type { Course } from "../lib/courses";
import type { Page } from "../lib/pages";

export default function PageDetailPage({ course, page, pageReady, moduleName, onSavePage, onDeletePage }: Readonly<{
  course: Course | undefined;
  page: Page | undefined;
  pageReady: boolean;
  moduleName: string | undefined;
  onSavePage: (page: Page) => void;
  onDeletePage: () => void;
}>) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const backLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setShowBackToTop(false);
    const link = backLink.current;
    const scrollArea = link?.closest("main");
    if (!link || !scrollArea) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowBackToTop(!entry.isIntersecting),
      { root: scrollArea },
    );
    observer.observe(link);
    return () => observer.disconnect();
  }, [page?.id, pageReady]);

  function scrollToTop() {
    backLink.current?.closest("main")?.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  if (!course || (pageReady && !page)) return (
    <section className={clsx("p-8 sm:p-14")}>
      <PageTitle>Page not found</PageTitle>
      <BodyText tone="muted" className={clsx("mt-3")}>This page may have been deleted. Choose another course from the sidebar.</BodyText>
      <Link to="/courses" className={clsx("mt-6 inline-block text-sm underline underline-offset-4")}>Back to all courses</Link>
    </section>
  );

  if (!pageReady || !page) return <BodyText role="status" tone="muted" className={clsx("p-8")}>Opening this page…</BodyText>;

  return (
    <div className={clsx("px-4 py-5 sm:px-6")}>
      <Link ref={backLink} to={`/courses/${course.id}/modules/${page.module_id}`} className={clsx("inline-flex items-center gap-2 rounded-md", "border border-ink/15", "px-3 py-2 text-sm font-medium", "hover:bg-ink/5")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14" /></svg>
        Back to {moduleName ?? "module"}
      </Link>
      <nav aria-label="Breadcrumb" className={clsx("mt-4 flex items-center gap-3 text-xs text-muted")}>
        <Link to="/courses" className={clsx("shrink-0 hover:text-ink")}>Your courses</Link><span aria-hidden="true">/</span>
        <Link to={`/courses/${course.id}`} className={clsx("shrink-0 truncate hover:text-ink")}>{course.name}</Link><span aria-hidden="true">/</span>
        <Link to={`/courses/${course.id}/modules/${page.module_id}`} className={clsx("shrink-0 truncate hover:text-ink")}>{moduleName ?? "Module"}</Link><span aria-hidden="true">/</span>
        <span className={clsx("truncate")} aria-current="page">{page.title}</span>
      </nav>
      <div className={clsx("mt-6 flex flex-wrap items-start justify-between gap-4")}>
        <div className={clsx("min-w-0")}>
          <PageTitle className={clsx("wrap-anywhere")}>{page.title}</PageTitle>
          <Typography as="span" variant="caption" tone="muted" className={clsx("mt-2 inline-block rounded-full border border-ink/15 px-2 py-0.5")}>{pageTypeLabels[page.type]}</Typography>
        </div>
        <div className={clsx("flex gap-2")}>
          <button type="button" onClick={() => setDialog("edit")} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}>Edit page</button>
          <button type="button" onClick={() => setDialog("delete")} className={clsx("rounded-md px-3 py-2 text-sm text-muted", "hover:bg-danger/10 hover:text-danger")}>Delete</button>
        </div>
      </div>
      <div className={clsx("mt-6 border-t border-ink/10 pt-5")}>
        <PageEditor key={page.id} pageId={page.id} content={page.content} onSaved={(content) => onSavePage({ ...page, content })} />
      </div>
      {showBackToTop && (
        <button type="button" onClick={scrollToTop} aria-label="Back to top" title="Back to top" className={clsx("fixed right-6 bottom-6 z-40 flex size-10 items-center justify-center rounded-md", "border border-ink/15 bg-surface text-ink shadow-sm", "hover:bg-sidebar")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 14 7-7 7 7M12 7v13" /></svg>
        </button>
      )}
      {dialog === "edit" && <PageForm key={page.id} moduleId={page.module_id} page={page} onClose={() => setDialog(null)} onSave={(updated) => { onSavePage(updated); setDialog(null); }} />}
      {dialog === "delete" && <DeletePage page={page} onClose={() => setDialog(null)} onDelete={onDeletePage} />}
    </div>
  );
}
