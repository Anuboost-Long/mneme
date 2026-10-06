import DeleteModule from "@/features/courses/components/DeleteModule";
import DeletePage from "@/features/courses/components/DeletePage";
import DeletePages from "@/features/courses/components/DeletePages";
import LmsImportForm from "@/features/courses/components/LmsImportForm";
import ModuleForm from "@/features/courses/components/ModuleForm";
import MovePageDialog from "@/features/courses/components/MovePageDialog";
import PageCard from "@/features/courses/components/PageCard";
import type { PageItemProps } from "@/features/courses/components/pageDisplay";
import PageForm from "@/features/courses/components/PageForm";
import ProgressSummary from "@/features/courses/components/ProgressSummary";
import ReadingRow from "@/features/courses/components/ReadingRow";
import SiblingSwitcher from "@/features/courses/components/SiblingSwitcher";
import { StatusChip } from "@/features/courses/components/StatusPicker";
import ViewToggle from "@/features/courses/components/ViewToggle";
import { CompletionStatus } from "@/features/courses/lib/completion-status";
import type { Course } from "@/features/courses/lib/course/types";
import { updateModule } from "@/features/courses/lib/module/actions";
import type { Module } from "@/features/courses/lib/module/types";
import { pageTypeLabel, pageTypeOptions } from "@/features/courses/lib/page-type/pageTypesState";
import { duplicatePage, setPageDone } from "@/features/courses/lib/page/actions";
import { type Page } from "@/features/courses/lib/page/types";
import ReadAloudBar from "@/features/read-aloud/components/ReadAloudBar";
import { textChunks } from "@/features/read-aloud/lib/readableText";
import { useReadAloud } from "@/features/read-aloud/lib/useReadAloud";
import FindTasksDialog from "@/features/tasks/components/FindTasksDialog";
import { addCommandSource } from "@/shared/lib/commandSources";
import { DATE_GROUP_VALUES, groupByDate, groupItems } from "@/shared/lib/dateGroups";
import { useLastValue } from "@/shared/lib/dialogState";
import { errorMessage } from "@/shared/lib/errorMessage";
import { useDragReorder } from "@/shared/lib/useDragReorder";
import { useListView, type SortOption } from "@/shared/lib/useListView";
import { useStoredChoice } from "@/shared/lib/useStoredChoice";
import CourseIcon from "@/shared/ui/CourseIcon";
import DragHandle from "@/shared/ui/DragHandle";
import ListToolbar, { DATE_GROUP_OPTIONS } from "@/shared/ui/ListToolbar";
import { BodyText, PageTitle, Typography } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const PAGE_VIEWS = ["list", "gallery"] as const;

const PAGE_GROUP_VALUES = [...DATE_GROUP_VALUES, "type"] as const;
const PAGE_GROUP_OPTIONS = [...DATE_GROUP_OPTIONS, { value: "type" as const, label: "By type" }];

type PageSortKey = "order" | "oldest" | "newest" | "name" | "type";

const PAGE_SORTS: SortOption<Page, PageSortKey>[] = [
  {
    value: "order",
    label: "Page order",
    compare: (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)
  },
  {
    value: "oldest",
    label: "Oldest first",
    compare: (a, b) => a.created_at.localeCompare(b.created_at)
  },
  {
    value: "newest",
    label: "Newest first",
    compare: (a, b) => b.created_at.localeCompare(a.created_at)
  },
  { value: "name", label: "Name (A–Z)", compare: (a, b) => a.title.localeCompare(b.title) },
  {
    value: "type",
    label: "Type",
    compare: (a, b) => pageTypeLabel(a.type).localeCompare(pageTypeLabel(b.type))
  }
];

export default function ModulePage({
  course,
  module,
  modules,
  moduleReady,
  pages,
  pagesReady,
  onSaveModule,
  onDeleteModule,
  onSavePage,
  onDeletePage,
  onReorderPages,
  onPagesChanged
}: Readonly<{
  course: Course | undefined;
  module: Module | undefined;
  modules: Module[];
  moduleReady: boolean;
  pages: Page[];
  pagesReady: boolean;
  onSaveModule: (module: Module) => void;
  onDeleteModule: () => void;
  onSavePage: (page: Page) => void;
  onDeletePage: (id: number) => void;
  onReorderPages: (pages: Page[]) => void;
  onPagesChanged: () => void;
}>) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [pageDialog, setPageDialog] = useState<
    { type: "edit" | "delete" | "move"; page: Page } | "create" | "import" | "import-file" | null
  >(null);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<number> | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [doneError, setDoneError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [findingTasks, setFindingTasks] = useState(false);
  const [tasksAdded, setTasksAdded] = useState(0);
  const reader = useReadAloud();
  const navigate = useNavigate();
  const pageTarget = useLastValue(typeof pageDialog === "object" ? pageDialog?.page : null);
  const bulkDeleteIds = useLastValue(selectedPageIds);

  useEffect(() => {
    if (!module || !pagesReady) return;
    return addCommandSource({
      group: "This module",
      load: async () => [
        {
          id: "module-new-page",
          label: "New page",
          detail: module.name,
          run: () => setPageDialog("create")
        },
        {
          id: "module-import-lms",
          label: "Import from LMS",
          detail: module.name,
          run: () => setPageDialog("import")
        },
        {
          id: "module-import-file",
          label: "Import PDF or document",
          detail: module.name,
          run: () => setPageDialog("import-file")
        },
        {
          id: "module-find-tasks",
          label: "Find tasks",
          detail: module.name,
          run: () => setFindingTasks(true)
        },
        {
          id: "module-flashcards",
          label: "Flashcards",
          detail: module.name,
          run: () => navigate(`/courses/${module.course_id}/modules/${module.id}/flashcards`)
        },
        {
          id: "module-study-flashcards",
          label: "Study flashcards",
          detail: module.name,
          run: () => navigate(`/courses/${module.course_id}/modules/${module.id}/flashcards/review`)
        }
      ]
    });
  }, [module, pagesReady]);

  const [groupBy, setGroupBy] = useStoredChoice("mneme.pages.group", PAGE_GROUP_VALUES, "none");

  const typeFilteredPages = useMemo(
    () => (typeFilter === "all" ? pages : pages.filter((page) => String(page.type) === typeFilter)),
    [pages, typeFilter]
  );
  const matchesPageQuery = (page: Page, query: string) => page.title.toLowerCase().includes(query);
  const {
    query,
    setQuery,
    sortValue,
    setSortValue,
    visible: visiblePages
  } = useListView(typeFilteredPages, matchesPageQuery, PAGE_SORTS, "mneme.pages.sort");
  const pageGroups = useMemo(
    () =>
      groupBy === "type"
        ? groupItems(
            visiblePages,
            (page) => page.type,
            pageTypeOptions().map(({ value }) => value),
            (type) => pageTypeLabel(type)
          )
        : groupByDate(
            visiblePages,
            (page) => page.created_at,
            groupBy,
            sortValue === "oldest" ? "oldest" : "newest"
          ),
    [visiblePages, groupBy, sortValue]
  );

  const [view, setView] = useStoredChoice("mneme.pages.view", PAGE_VIEWS, "list");
  // Dragging needs the whole list in page order, not a search, filter or
  // selection of it. It works the same in both views.
  const canReorder =
    sortValue === "order" &&
    groupBy === "none" &&
    !query.trim() &&
    typeFilter === "all" &&
    selectedPageIds === null;
  const reorderable = useDragReorder(visiblePages, onReorderPages);

  // Dragging only works on the whole list in page order, so this puts the
  // list there and the grips appear.
  function showPageOrder() {
    setSortValue("order");
    setGroupBy("none");
    setQuery("");
    setTypeFilter("all");
  }

  // Everything a list row and a gallery card share.
  function pageItemProps(page: Page): PageItemProps {
    return {
      page,
      courseColor: course?.color ?? null,
      to: `/courses/${course?.id}/modules/${module?.id}/pages/${page.id}`,
      onToggleDone: () => {
        setDoneError(null);
        setPageDone(page.id, page.status !== CompletionStatus.Completed)
          .then(onSavePage)
          .catch((error) =>
            setDoneError(errorMessage(error, "Couldn’t update this page. Try again."))
          );
      },
      onEdit: () => setPageDialog({ type: "edit", page }),
      onDelete: () => setPageDialog({ type: "delete", page }),
      actions: [
        {
          label: "Duplicate",
          icon: "M8 8h12v12H8zM16 8V4H4v12h4",
          onSelect: () => duplicate(page)
        },
        {
          label: "Move to…",
          icon: "M5 12h14m-6-6 6 6-6 6",
          onSelect: () => setPageDialog({ type: "move", page })
        }
      ],
      selectable: selectedPageIds !== null,
      selected: selectedPageIds?.has(page.id) ?? false,
      onToggleSelect: () => togglePageSelected(page.id)
    };
  }

  function duplicate(page: Page) {
    setDoneError(null);
    duplicatePage(page.id)
      .then(onPagesChanged)
      .catch((error) =>
        setDoneError(errorMessage(error, "Couldn’t duplicate this page. Try again."))
      );
  }

  function togglePageSelected(id: number) {
    setSelectedPageIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllPages() {
    setSelectedPageIds((current) => {
      const next = new Set(current);
      const allVisibleSelected =
        visiblePages.length > 0 && visiblePages.every((page) => next.has(page.id));
      visiblePages.forEach((page) =>
        allVisibleSelected ? next.delete(page.id) : next.add(page.id)
      );
      return next;
    });
  }

  if (!course || (moduleReady && !module))
    return (
      <section className={clsx("p-8 sm:p-14")}>
        <PageTitle>Module not found</PageTitle>
        <BodyText tone="muted" className={clsx("mt-3")}>
          This module may have been deleted. Choose another course from the sidebar.
        </BodyText>
        <Link
          to="/courses"
          className={clsx("mt-6 inline-block text-sm underline underline-offset-4")}
        >
          Back to all courses
        </Link>
      </section>
    );

  if (!moduleReady || !module)
    return (
      <BodyText role="status" tone="muted" className={clsx("p-8")}>
        Opening this module…
      </BodyText>
    );

  return (
    <div className={clsx("px-4 py-5 sm:px-6")}>
      <Link
        to={`/courses/${course.id}`}
        className={clsx(
          "-ml-2 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted",
          "hover:bg-ink/5 hover:text-ink"
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m12 5-7 7 7 7M5 12h14" />
        </svg>
        Back to {course.name}
      </Link>
      <nav
        aria-label="Breadcrumb"
        className={clsx("mt-4 flex items-center gap-3 text-xs text-muted")}
      >
        <Link to="/courses" className={clsx("shrink-0 hover:text-ink")}>
          Your courses
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/courses/${course.id}`} className={clsx("shrink-0 truncate hover:text-ink")}>
          {course.name}
        </Link>
        <span aria-hidden="true">/</span>
        <SiblingSwitcher
          noun="module"
          color={course.color}
          siblings={modules}
          current={module}
          path={(id) => `/courses/${course.id}/modules/${id}`}
        />
      </nav>
      <div className={clsx("mt-6 flex flex-wrap items-start justify-between gap-4")}>
        <div className={clsx("min-w-0")}>
          <div className={clsx("flex items-center gap-4")}>
            {module.icon && <CourseIcon icon={module.icon} color={course.color} large />}
            <PageTitle className={clsx("min-w-0 text-4xl wrap-anywhere")}>{module.name}</PageTitle>
          </div>
          <StatusChip
            status={module.status}
            itemLabel={module.name}
            onChange={(status) => {
              setStatusError(null);
              updateModule(module.id, { status })
                .then(onSaveModule)
                .catch((error) =>
                  setStatusError(
                    errorMessage(error, "Couldn’t change this module’s status. Try again.")
                  )
                );
            }}
          />
          {statusError && (
            <BodyText role="alert" tone="error" className={clsx("mt-1")}>
              {statusError}
            </BodyText>
          )}
          {tasksAdded > 0 && (
            <BodyText role="status" tone="muted" className={clsx("mt-1")}>
              {tasksAdded === 1 ? "1 task added" : `${tasksAdded} tasks added`} to{" "}
              <Link to="/tasks" className={clsx("text-ink underline underline-offset-4")}>
                Tasks
              </Link>
              .
            </BodyText>
          )}
        </div>
        <div className={clsx("flex gap-2")}>
          {reader.supported && module.description && (
            <button
              type="button"
              onClick={() =>
                reader.read([{ text: module.name }, ...textChunks(module.description ?? "")])
              }
              className={clsx(
                "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
                "hover:bg-ink/5"
              )}
            >
              Listen
            </button>
          )}
          <Link
            to={`/courses/${course.id}/modules/${module.id}/highlights`}
            className={clsx(
              "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
              "hover:bg-ink/5"
            )}
          >
            Highlights
          </Link>
          <Link
            to={`/courses/${course.id}/modules/${module.id}/flashcards`}
            className={clsx(
              "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
              "hover:bg-ink/5"
            )}
          >
            Flashcards
          </Link>
          <button
            type="button"
            onClick={() => setDialog("edit")}
            className={clsx(
              "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
              "hover:bg-ink/5"
            )}
          >
            Edit module
          </button>
          <button
            type="button"
            onClick={() => setDialog("delete")}
            className={clsx(
              "rounded-md px-3 py-2 text-sm text-muted",
              "hover:bg-danger/10 hover:text-danger"
            )}
          >
            Delete
          </button>
        </div>
      </div>
      {module.description && (
        <BodyText
          tone="muted"
          className={clsx("mt-4 max-w-2xl text-base leading-7 whitespace-pre-wrap wrap-anywhere")}
        >
          {module.description}
        </BodyText>
      )}
      {pages.length > 0 && (
        <ProgressSummary
          done={pages.filter((page) => page.status === CompletionStatus.Completed).length}
          total={pages.length}
          noun="pages"
          className={clsx("mt-6")}
        />
      )}
      <section aria-label="Pages" className={clsx("@container mt-6 border-t border-ink/10 pt-5")}>
        <div className={clsx("flex flex-wrap items-center justify-between gap-3")}>
          <Typography as="h2" variant="label">
            Pages
          </Typography>
          <div className={clsx("flex flex-wrap items-center gap-2")}>
            {selectedPageIds ? (
              <>
                <label className={clsx("flex items-center gap-2 pr-1 text-sm text-muted")}>
                  <input
                    type="checkbox"
                    checked={
                      visiblePages.length > 0 &&
                      visiblePages.every((page) => selectedPageIds.has(page.id))
                    }
                    onChange={toggleSelectAllPages}
                    className={clsx("size-4")}
                  />
                  Select all
                </label>
                <BodyText tone="muted" className={clsx("text-sm")}>
                  {selectedPageIds.size} selected
                </BodyText>
                <button
                  type="button"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={selectedPageIds.size === 0}
                  className={clsx(
                    "h-9 rounded-md bg-danger/10 px-3 text-sm font-medium text-danger",
                    "hover:bg-danger/15",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  Delete selected
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPageIds(null)}
                  className={clsx(
                    "h-9 rounded-md border border-ink/20 bg-surface px-3 text-sm font-medium text-ink",
                    "hover:bg-ink/5"
                  )}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <ViewToggle value={view} onChange={setView} />
                {pages.length > 1 && !canReorder && (
                  <button
                    type="button"
                    onClick={showPageOrder}
                    className={clsx(
                      "h-9 rounded-md px-3 text-sm text-muted",
                      "hover:bg-ink/5 hover:text-ink"
                    )}
                  >
                    Rearrange
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPageDialog("import")}
                  disabled={!pagesReady}
                  className={clsx(
                    "inline-flex h-9 items-center gap-2 rounded-md border border-ink/20 bg-surface px-3 text-sm font-medium text-ink",
                    "hover:bg-ink/5"
                  )}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 3v12m0 0-4-4m4 4 4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
                  </svg>
                  Import
                </button>
                <button
                  type="button"
                  onClick={() => setPageDialog("create")}
                  disabled={!pagesReady}
                  className={clsx(
                    "inline-flex h-9 items-center gap-2 rounded-md bg-action px-3 text-sm font-medium text-on-action",
                    "hover:opacity-85"
                  )}
                >
                  <span aria-hidden="true" className={clsx("text-lg leading-none")}>
                    +
                  </span>{" "}
                  New page
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPageIds(new Set())}
                  disabled={!pagesReady || pages.length === 0}
                  className={clsx(
                    "h-9 rounded-md border border-ink/20 bg-surface px-3 text-sm font-medium text-ink",
                    "hover:bg-ink/5",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  Select
                </button>
              </>
            )}
          </div>
        </div>
        {pages.length === 0 ? (
          <div className={clsx("py-16 text-center sm:py-24")}>
            <svg
              className={clsx("mx-auto size-10 text-ink/25")}
              viewBox="0 0 40 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <rect x="9" y="4" width="22" height="32" rx="2" />
              <path d="M14 13h12M14 19h12M14 25h8" />
            </svg>
            <Typography as="h3" variant="itemTitle" className={clsx("mt-5")}>
              Nothing here yet
            </Typography>
            <BodyText tone="muted" className={clsx("mx-auto mt-2 max-w-xs")}>
              Lessons, exercises and everything else in this module will live here.
            </BodyText>
          </div>
        ) : (
          <>
            <ListToolbar
              query={query}
              onQueryChange={setQuery}
              searchPlaceholder="Search pages…"
              filterLabel="Type"
              filterValue={typeFilter}
              onFilterChange={setTypeFilter}
              filterOptions={[
                { value: "all", label: "All types" },
                ...pageTypeOptions().map(({ value, label }) => ({ value: String(value), label }))
              ]}
              sortValue={sortValue}
              onSortChange={setSortValue}
              sortOptions={PAGE_SORTS}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              groupOptions={PAGE_GROUP_OPTIONS}
              className={clsx("mt-5")}
            />
            {visiblePages.length === 0 ? (
              <BodyText tone="muted" className={clsx("mt-8 text-center")}>
                No pages match your search or filter.
              </BodyText>
            ) : (
              <div className={clsx("mt-4 space-y-8")}>
                {doneError && (
                  <BodyText role="alert" tone="error">
                    {doneError}
                  </BodyText>
                )}
                {pageGroups.map((group) => (
                  <section key={group.key} aria-label={group.label || "Pages"}>
                    {group.label && (
                      <Typography
                        as="p"
                        variant="caption"
                        tone="muted"
                        className={clsx("mb-3 font-medium")}
                      >
                        {group.label}
                      </Typography>
                    )}
                    {view === "gallery" ? (
                      <ul className={clsx("grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3")}>
                        {(canReorder ? reorderable.items : group.items).map((page, index) => (
                          <PageCard
                            key={page.id}
                            ref={canReorder ? reorderable.itemRef(page.id) : undefined}
                            handle={
                              canReorder ? (
                                <DragHandle
                                  name={page.title}
                                  {...reorderable.handleProps(page.id, index)}
                                />
                              ) : undefined
                            }
                            dragging={reorderable.draggingId === page.id}
                            {...pageItemProps(page)}
                          />
                        ))}
                      </ul>
                    ) : (
                      <ul className={clsx("-mx-3 min-w-0")}>
                        {(canReorder ? reorderable.items : group.items).map((page, index) => (
                          <ReadingRow
                            key={page.id}
                            ref={canReorder ? reorderable.itemRef(page.id) : undefined}
                            handle={
                              canReorder ? (
                                <DragHandle
                                  name={page.title}
                                  {...reorderable.handleProps(page.id, index)}
                                />
                              ) : undefined
                            }
                            dragging={reorderable.draggingId === page.id}
                            {...pageItemProps(page)}
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
      <ReadAloudBar reader={reader} />
      <ModuleForm
        open={dialog === "edit"}
        courseId={course.id}
        courseColor={course.color}
        module={module}
        onClose={() => setDialog(null)}
        onSave={(updated) => {
          onSaveModule(updated);
          setDialog(null);
        }}
      />
      <DeleteModule
        open={dialog === "delete"}
        module={module}
        onClose={() => setDialog(null)}
        onDelete={onDeleteModule}
      />
      <PageForm
        open={pageDialog === "create"}
        courseColor={course.color}
        moduleId={module.id}
        onClose={() => setPageDialog(null)}
        onSave={(page) => {
          onSavePage(page);
          setPageDialog(null);
        }}
      />
      <FindTasksDialog
        open={findingTasks}
        courses={[course]}
        courseId={course.id}
        moduleId={module.id}
        onAdded={setTasksAdded}
        onClose={() => setFindingTasks(false)}
      />
      <LmsImportForm
        open={pageDialog === "import" || pageDialog === "import-file"}
        courseId={module.course_id}
        moduleId={module.id}
        initialSource={pageDialog === "import-file" ? "file" : "url"}
        onClose={() => setPageDialog(null)}
        onImported={(pages) => pages.forEach(onSavePage)}
      />
      <PageForm
        open={typeof pageDialog === "object" && pageDialog?.type === "edit"}
        courseColor={course.color}
        moduleId={module.id}
        page={pageTarget}
        onClose={() => setPageDialog(null)}
        onSave={(page) => {
          onSavePage(page);
          setPageDialog(null);
        }}
      />
      <MovePageDialog
        open={typeof pageDialog === "object" && pageDialog?.type === "move"}
        page={pageTarget}
        onClose={() => setPageDialog(null)}
        onMoved={(moved) => {
          onDeletePage(moved.id);
          setPageDialog(null);
        }}
      />
      <DeletePage
        open={typeof pageDialog === "object" && pageDialog?.type === "delete"}
        page={pageTarget}
        onClose={() => setPageDialog(null)}
        onDelete={() => {
          if (pageTarget) onDeletePage(pageTarget.id);
          setPageDialog(null);
        }}
      />
      <DeletePages
        open={bulkDeleteOpen && selectedPageIds !== null}
        pageIds={[...(bulkDeleteIds ?? [])]}
        onClose={() => setBulkDeleteOpen(false)}
        onDelete={() => {
          selectedPageIds?.forEach(onDeletePage);
          setBulkDeleteOpen(false);
          setSelectedPageIds(null);
        }}
      />
    </div>
  );
}
