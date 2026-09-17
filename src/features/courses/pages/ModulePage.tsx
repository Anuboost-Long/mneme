import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { BodyText, PageTitle, Typography } from "../../../shared/ui/Typography";
import ModuleForm, { moduleStatusLabels } from "../components/ModuleForm";
import DeleteModule from "../components/DeleteModule";
import PageForm, { pageTypeLabels } from "../components/PageForm";
import DeletePage from "../components/DeletePage";
import GalleryCard from "../components/GalleryCard";
import type { Course } from "../lib/courses";
import type { Module } from "../lib/modules";
import { pageContentPreview, type Page } from "../lib/pages";

export default function ModulePage({ course, module, moduleReady, pages, pagesReady, onSaveModule, onDeleteModule, onSavePage, onDeletePage }: Readonly<{
  course: Course | undefined;
  module: Module | undefined;
  moduleReady: boolean;
  pages: Page[];
  pagesReady: boolean;
  onSaveModule: (module: Module) => void;
  onDeleteModule: () => void;
  onSavePage: (page: Page) => void;
  onDeletePage: (id: number) => void;
}>) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [pageDialog, setPageDialog] = useState<{ type: "edit" | "delete"; page: Page } | "create" | null>(null);

  if (!course || (moduleReady && !module)) return (
    <section className={clsx("p-8 sm:p-14")}>
      <PageTitle>Module not found</PageTitle>
      <BodyText tone="muted" className={clsx("mt-3")}>This module may have been deleted. Choose another course from the sidebar.</BodyText>
      <Link to="/courses" className={clsx("mt-6 inline-block text-sm underline underline-offset-4")}>Back to all courses</Link>
    </section>
  );

  if (!moduleReady || !module) return <BodyText role="status" tone="muted" className={clsx("p-8")}>Opening this module…</BodyText>;

  return (
    <div className={clsx("px-4 py-5 sm:px-6")}>
      <Link to={`/courses/${course.id}`} className={clsx("inline-flex items-center gap-2 rounded-md", "border border-ink/15", "px-3 py-2 text-sm font-medium", "hover:bg-ink/5")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14" /></svg>
        Back to {course.name}
      </Link>
      <nav aria-label="Breadcrumb" className={clsx("mt-4 flex items-center gap-3 text-xs text-muted")}>
        <Link to="/courses" className={clsx("shrink-0 hover:text-ink")}>Your courses</Link><span aria-hidden="true">/</span>
        <Link to={`/courses/${course.id}`} className={clsx("shrink-0 truncate hover:text-ink")}>{course.name}</Link><span aria-hidden="true">/</span>
        <span className={clsx("truncate")} aria-current="page">{module.name}</span>
      </nav>
      <div className={clsx("mt-6 flex flex-wrap items-start justify-between gap-4")}>
        <div className={clsx("min-w-0")}>
          <PageTitle className={clsx("wrap-anywhere")}>{module.name}</PageTitle>
          <Typography as="span" variant="caption" tone="muted" className={clsx("mt-2 inline-block rounded-full border border-ink/15 px-2 py-0.5")}>{moduleStatusLabels[module.status]}</Typography>
        </div>
        <div className={clsx("flex gap-2")}>
          <button type="button" onClick={() => setDialog("edit")} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}>Edit module</button>
          <button type="button" onClick={() => setDialog("delete")} className={clsx("rounded-md px-3 py-2 text-sm text-muted", "hover:bg-danger/10 hover:text-danger")}>Delete</button>
        </div>
      </div>
      {module.description && <BodyText tone="muted" className={clsx("mt-3 whitespace-pre-wrap wrap-anywhere")}>{module.description}</BodyText>}
      <section aria-label="Pages" className={clsx("@container mt-6 border-t border-ink/10 pt-5")}>
        <div className={clsx("flex items-center justify-between gap-4")}>
          <Typography as="h2" variant="label">Pages</Typography>
          <button type="button" onClick={() => setPageDialog("create")} disabled={!pagesReady} className={clsx("flex items-center gap-2 text-sm text-muted", "hover:text-ink")}>
            <span aria-hidden="true" className={clsx("text-lg leading-none")}>+</span> New page
          </button>
        </div>
        {pages.length === 0 ? (
          <div className={clsx("py-16 text-center sm:py-24")}>
            <svg className={clsx("mx-auto size-10 text-ink/25")} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="9" y="4" width="22" height="32" rx="2" /><path d="M14 13h12M14 19h12M14 25h8" /></svg>
            <Typography as="h3" variant="itemTitle" className={clsx("mt-5")}>Nothing here yet</Typography>
            <BodyText tone="muted" className={clsx("mx-auto mt-2 max-w-xs")}>Lessons, exercises and everything else in this module will live here.</BodyText>
          </div>
        ) : (
          <ul className={clsx("mt-5 grid grid-cols-1 gap-4 @min-lg:grid-cols-2 @min-3xl:grid-cols-3")}>
            {pages.map((page) => (
              <GalleryCard key={page.id} title={page.title} badge={pageTypeLabels[page.type]} description={pageContentPreview(page.content)} color={course.color} to={`/courses/${course.id}/modules/${module.id}/pages/${page.id}`} openLabel="Open page" onEdit={() => setPageDialog({ type: "edit", page })} onDelete={() => setPageDialog({ type: "delete", page })} />
            ))}
          </ul>
        )}
      </section>
      {dialog === "edit" && <ModuleForm key={module.id} courseId={course.id} module={module} onClose={() => setDialog(null)} onSave={(updated) => { onSaveModule(updated); setDialog(null); }} />}
      {dialog === "delete" && <DeleteModule module={module} onClose={() => setDialog(null)} onDelete={onDeleteModule} />}
      {pageDialog === "create" && <PageForm moduleId={module.id} onClose={() => setPageDialog(null)} onSave={(page) => { onSavePage(page); setPageDialog(null); }} />}
      {pageDialog && pageDialog !== "create" && pageDialog.type === "edit" && <PageForm key={pageDialog.page.id} moduleId={module.id} page={pageDialog.page} onClose={() => setPageDialog(null)} onSave={(page) => { onSavePage(page); setPageDialog(null); }} />}
      {pageDialog && pageDialog !== "create" && pageDialog.type === "delete" && <DeletePage page={pageDialog.page} onClose={() => setPageDialog(null)} onDelete={() => { onDeletePage(pageDialog.page.id); setPageDialog(null); }} />}
    </div>
  );
}
