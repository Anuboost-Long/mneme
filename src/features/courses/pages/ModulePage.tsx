import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { BodyText, PageTitle, Typography } from "../../../shared/ui/Typography";
import ModuleForm, { moduleStatusLabels } from "../components/ModuleForm";
import DeleteModule from "../components/DeleteModule";
import PageForm, { pageTypeLabels } from "../components/PageForm";
import LmsImportForm from "../components/LmsImportForm";
import DeletePage from "../components/DeletePage";
import DeletePages from "../components/DeletePages";
import GalleryCard from "../components/GalleryCard";
import GalleryListRow from "../components/GalleryListRow";
import ListToolbar, { type ViewMode } from "../../../shared/ui/ListToolbar";
import { useListView, type SortOption } from "../../../shared/lib/useListView";
import { useStoredChoice } from "../../../shared/lib/useStoredChoice";
import { DATE_GROUP_VALUES, groupByDate } from "../../../shared/lib/dateGroups";
import type { Course } from "../lib/courses";
import type { Module } from "../lib/modules";
import { pageContentPreview, pageTypes, type Page } from "../lib/pages";

type PageSortKey = "oldest" | "newest" | "name" | "type";

const PAGE_SORTS: SortOption<Page, PageSortKey>[] = [
  { value: "oldest", label: "Oldest first", compare: (a, b) => a.created_at.localeCompare(b.created_at) },
  { value: "newest", label: "Newest first", compare: (a, b) => b.created_at.localeCompare(a.created_at) },
  { value: "name", label: "Name (A–Z)", compare: (a, b) => a.title.localeCompare(b.title) },
  { value: "type", label: "Type", compare: (a, b) => pageTypeLabels[a.type].localeCompare(pageTypeLabels[b.type]) },
];

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
  const [pageDialog, setPageDialog] = useState<{ type: "edit" | "delete"; page: Page } | "create" | "import" | null>(null);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<number> | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [groupBy, setGroupBy] = useStoredChoice("mneme.pages.group", DATE_GROUP_VALUES, "none");
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");

  const typeFilteredPages = useMemo(
    () => (typeFilter === "all" ? pages : pages.filter((page) => String(page.type) === typeFilter)),
    [pages, typeFilter],
  );
  const matchesPageQuery = (page: Page, query: string) => page.title.toLowerCase().includes(query);
  const { query, setQuery, sortValue, setSortValue, visible: visiblePages } = useListView(typeFilteredPages, matchesPageQuery, PAGE_SORTS, "mneme.pages.sort");
  const pageGroups = useMemo(() => groupByDate(visiblePages, (page) => page.created_at, groupBy, sortValue === "oldest" ? "oldest" : "newest"), [visiblePages, groupBy, sortValue]);

  function togglePageSelected(id: number) {
    setSelectedPageIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAllPages() {
    setSelectedPageIds((current) => {
      const next = new Set(current);
      const allVisibleSelected = visiblePages.length > 0 && visiblePages.every((page) => next.has(page.id));
      visiblePages.forEach((page) => (allVisibleSelected ? next.delete(page.id) : next.add(page.id)));
      return next;
    });
  }

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
        <div className={clsx("flex flex-wrap items-center justify-between gap-3")}>
          <Typography as="h2" variant="label">Pages</Typography>
          <div className={clsx("flex flex-wrap items-center gap-2")}>
            {selectedPageIds ? (
              <>
                <label className={clsx("flex items-center gap-2 pr-1 text-sm text-muted")}>
                  <input type="checkbox" checked={visiblePages.length > 0 && visiblePages.every((page) => selectedPageIds.has(page.id))} onChange={toggleSelectAllPages} className={clsx("size-4")} />
                  Select all
                </label>
                <BodyText tone="muted" className={clsx("text-sm")}>{selectedPageIds.size} selected</BodyText>
                <button type="button" onClick={() => setBulkDeleteOpen(true)} disabled={selectedPageIds.size === 0} className={clsx("h-9 rounded-md bg-danger/10 px-3 text-sm font-medium text-danger", "hover:bg-danger/15", "disabled:cursor-not-allowed disabled:opacity-50")}>Delete selected</button>
                <button type="button" onClick={() => setSelectedPageIds(null)} className={clsx("h-9 rounded-md border border-ink/20 bg-surface px-3 text-sm font-medium text-ink", "hover:bg-ink/5")}>Cancel</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setPageDialog("import")} disabled={!pagesReady} className={clsx("inline-flex h-9 items-center gap-2 rounded-md border border-ink/20 bg-surface px-3 text-sm font-medium text-ink", "hover:bg-ink/5")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" /></svg>
                  Import
                </button>
                <button type="button" onClick={() => setPageDialog("create")} disabled={!pagesReady} className={clsx("inline-flex h-9 items-center gap-2 rounded-md bg-action px-3 text-sm font-medium text-on-action", "hover:opacity-85")}>
                  <span aria-hidden="true" className={clsx("text-lg leading-none")}>+</span> New page
                </button>
                <button type="button" onClick={() => setSelectedPageIds(new Set())} disabled={!pagesReady || pages.length === 0} className={clsx("h-9 rounded-md border border-ink/20 bg-surface px-3 text-sm font-medium text-ink", "hover:bg-ink/5", "disabled:cursor-not-allowed disabled:opacity-50")}>Select</button>
              </>
            )}
          </div>
        </div>
        {pages.length === 0 ? (
          <div className={clsx("py-16 text-center sm:py-24")}>
            <svg className={clsx("mx-auto size-10 text-ink/25")} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="9" y="4" width="22" height="32" rx="2" /><path d="M14 13h12M14 19h12M14 25h8" /></svg>
            <Typography as="h3" variant="itemTitle" className={clsx("mt-5")}>Nothing here yet</Typography>
            <BodyText tone="muted" className={clsx("mx-auto mt-2 max-w-xs")}>Lessons, exercises and everything else in this module will live here.</BodyText>
          </div>
        ) : (
          <>
            <ListToolbar
              query={query} onQueryChange={setQuery} searchPlaceholder="Search pages…"
              filterLabel="Type" filterValue={typeFilter} onFilterChange={setTypeFilter}
              filterOptions={[{ value: "all", label: "All types" }, ...pageTypes.map((type) => ({ value: String(type), label: pageTypeLabels[type] }))]}
              sortValue={sortValue} onSortChange={setSortValue} sortOptions={PAGE_SORTS}
              groupBy={groupBy} onGroupByChange={setGroupBy}
              viewMode={viewMode} onViewModeChange={setViewMode}
              className={clsx("mt-5")}
            />
            {visiblePages.length === 0 ? (
              <BodyText tone="muted" className={clsx("mt-8 text-center")}>No pages match your search or filter.</BodyText>
            ) : (
              <div className={clsx("mt-6 space-y-8")}>
                {pageGroups.map((group) => (
                  <section key={group.key} aria-label={group.label || "Pages"} className={clsx(group.label && "@min-xl:grid @min-xl:grid-cols-[10rem_minmax(0,1fr)] @min-xl:gap-5")}>
                    {group.label && <Typography as="p" variant="caption" tone="muted" className={clsx("mb-3 font-medium @min-xl:mb-0 @min-xl:pt-3")}>{group.label}</Typography>}
                    {viewMode === "gallery" ? (
                      <ul className={clsx("grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(17rem,100%),1fr))] gap-4")}>
                        {group.items.map((page) => (
                          <GalleryCard
                            key={page.id} title={page.title} badge={pageTypeLabels[page.type]} description={pageContentPreview(page.content)} color={course.color} createdAt={page.created_at}
                            to={`/courses/${course.id}/modules/${module.id}/pages/${page.id}`} openLabel="Open page"
                            onEdit={() => setPageDialog({ type: "edit", page })} onDelete={() => setPageDialog({ type: "delete", page })}
                            selectable={selectedPageIds !== null} selected={selectedPageIds?.has(page.id) ?? false} onToggleSelect={() => togglePageSelected(page.id)}
                          />
                        ))}
                      </ul>
                    ) : (
                      <ul className={clsx("min-w-0 space-y-2")}>
                        {group.items.map((page) => (
                          <GalleryListRow
                            key={page.id} title={page.title} badge={pageTypeLabels[page.type]} description={pageContentPreview(page.content)} color={course.color} createdAt={page.created_at}
                            to={`/courses/${course.id}/modules/${module.id}/pages/${page.id}`}
                            onEdit={() => setPageDialog({ type: "edit", page })} onDelete={() => setPageDialog({ type: "delete", page })}
                            selectable={selectedPageIds !== null} selected={selectedPageIds?.has(page.id) ?? false} onToggleSelect={() => togglePageSelected(page.id)}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </section>
      {dialog === "edit" && <ModuleForm key={module.id} courseId={course.id} module={module} onClose={() => setDialog(null)} onSave={(updated) => { onSaveModule(updated); setDialog(null); }} />}
      {dialog === "delete" && <DeleteModule module={module} onClose={() => setDialog(null)} onDelete={onDeleteModule} />}
      {pageDialog === "create" && <PageForm moduleId={module.id} onClose={() => setPageDialog(null)} onSave={(page) => { onSavePage(page); setPageDialog(null); }} />}
      {pageDialog === "import" && <LmsImportForm moduleId={module.id} onClose={() => setPageDialog(null)} onImported={(pages) => { pages.forEach(onSavePage); setPageDialog(null); }} />}
      {pageDialog && typeof pageDialog === "object" && pageDialog.type === "edit" && <PageForm key={pageDialog.page.id} moduleId={module.id} page={pageDialog.page} onClose={() => setPageDialog(null)} onSave={(page) => { onSavePage(page); setPageDialog(null); }} />}
      {pageDialog && typeof pageDialog === "object" && pageDialog.type === "delete" && <DeletePage page={pageDialog.page} onClose={() => setPageDialog(null)} onDelete={() => { onDeletePage(pageDialog.page.id); setPageDialog(null); }} />}
      {bulkDeleteOpen && selectedPageIds && (
        <DeletePages
          pageIds={[...selectedPageIds]}
          onClose={() => setBulkDeleteOpen(false)}
          onDelete={() => { selectedPageIds.forEach(onDeletePage); setBulkDeleteOpen(false); setSelectedPageIds(null); }}
        />
      )}
    </div>
  );
}
