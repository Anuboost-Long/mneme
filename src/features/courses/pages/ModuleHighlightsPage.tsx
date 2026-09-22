import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { BodyText, Caption, PageTitle, SectionTitle } from "../../../shared/ui/Typography";
import { errorMessage } from "../../../shared/lib/errorMessage";
import type { Course } from "../lib/courses";
import type { Module } from "../lib/modules";
import type { Page } from "../lib/pages";
import { updatePage } from "../lib/pages";
import { deleteHighlight, keepOrphanedHighlight, stripHighlight, type Highlight } from "../lib/highlights";

export default function ModuleHighlightsPage({ course, module, moduleReady, pages, highlights, highlightsReady, onRemoveHighlight, onKeepHighlight }: Readonly<{
  course: Course | undefined;
  module: Module | undefined;
  moduleReady: boolean;
  pages: Page[];
  highlights: Highlight[];
  highlightsReady: boolean;
  onRemoveHighlight: (id: number) => void;
  onKeepHighlight: (id: number) => void;
}>) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function remove(highlight: Highlight) {
    setBusyId(highlight.id);
    setError("");
    try {
      if (highlight.orphaned_at) {
        await deleteHighlight(highlight.id);
      } else {
        const page = pages.find((item) => item.id === highlight.page_id);
        if (!page?.content) return;
        await updatePage(page.id, { content: stripHighlight(page.content, highlight.ref) }, { skipHighlightReconciliation: true });
      }
      onRemoveHighlight(highlight.id);
    } catch (error) {
      setError(errorMessage(error, "Couldn’t remove this highlight. Try again."));
    } finally {
      setBusyId(null);
    }
  }

  async function keep(highlight: Highlight) {
    setBusyId(highlight.id);
    setError("");
    try {
      await keepOrphanedHighlight(highlight.id);
      onKeepHighlight(highlight.id);
    } catch (error) {
      setError(errorMessage(error, "Couldn’t update this highlight. Try again."));
    } finally {
      setBusyId(null);
    }
  }

  if (!course || (moduleReady && !module)) return (
    <section className={clsx("p-8 sm:p-14")}>
      <PageTitle>Module not found</PageTitle>
      <BodyText tone="muted" className={clsx("mt-3")}>This module may have been deleted. Choose another course from the sidebar.</BodyText>
      <Link to="/courses" className={clsx("mt-6 inline-block text-sm underline underline-offset-4")}>Back to all courses</Link>
    </section>
  );

  if (!moduleReady || !module) return <BodyText role="status" tone="muted" className={clsx("p-8")}>Opening this module…</BodyText>;

  const groups = pages
    .map((page) => ({ page, items: highlights.filter((highlight) => highlight.page_id === page.id) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className={clsx("px-4 py-5 sm:px-6")}>
      <Link to={`/courses/${course.id}/modules/${module.id}`} className={clsx("inline-flex items-center gap-2 rounded-md", "border border-ink/15", "px-3 py-2 text-sm font-medium", "hover:bg-ink/5")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14" /></svg>
        Back to {module.name}
      </Link>
      <nav aria-label="Breadcrumb" className={clsx("mt-4 flex items-center gap-3 text-xs text-muted")}>
        <Link to="/courses" className={clsx("shrink-0 hover:text-ink")}>Your courses</Link><span aria-hidden="true">/</span>
        <Link to={`/courses/${course.id}`} className={clsx("shrink-0 truncate hover:text-ink")}>{course.name}</Link><span aria-hidden="true">/</span>
        <Link to={`/courses/${course.id}/modules/${module.id}`} className={clsx("shrink-0 truncate hover:text-ink")}>{module.name}</Link><span aria-hidden="true">/</span>
        <span className={clsx("truncate")} aria-current="page">Highlights</span>
      </nav>
      <div className={clsx("mt-6")}>
        <PageTitle className={clsx("wrap-anywhere")}>{module.name} highlights</PageTitle>
        <BodyText tone="muted" className={clsx("mt-2")}>Everything you’ve highlighted across this module’s pages, collected in one place.</BodyText>
      </div>
      {error && <BodyText role="alert" tone="error" className={clsx("mt-4")}>{error}</BodyText>}
      <div className={clsx("mt-6 border-t border-ink/10 pt-5")}>
        {!highlightsReady ? (
          <BodyText role="status" tone="muted">Loading highlights…</BodyText>
        ) : groups.length === 0 ? (
          <div className={clsx("py-16 text-center sm:py-24")}>
            <SectionTitle>Nothing highlighted yet</SectionTitle>
            <BodyText tone="muted" className={clsx("mx-auto mt-2 max-w-sm")}>Select text on a page, right-click, and choose Highlight to add it here.</BodyText>
          </div>
        ) : (
          <div className={clsx("space-y-8")}>
            {groups.map(({ page, items }) => (
              <section key={page.id} aria-labelledby={`highlight-page-${page.id}`}>
                <Link id={`highlight-page-${page.id}`} to={`/courses/${course.id}/modules/${module.id}/pages/${page.id}`} className={clsx("text-sm font-semibold text-ink hover:underline underline-offset-4")}>{page.title}</Link>
                <ul className={clsx("mt-3 space-y-4")}>
                  {items.map((highlight) => (
                    <li key={highlight.id} className={clsx("rounded-md border-l-4 py-3 pr-3 pl-4", highlight.orphaned_at ? "border-ink/15 bg-ink/5" : "border-chain-lime bg-chain-lime/10")}>
                      <div className={clsx("flex items-start justify-between gap-3")}>
                        <div className={clsx("page-editor-content min-w-0 flex-1 wrap-anywhere")} dangerouslySetInnerHTML={{ __html: highlight.html }} />
                        <div className={clsx("flex shrink-0 items-center gap-2")}>
                          {highlight.orphaned_at && (
                            <button type="button" disabled={busyId === highlight.id} onClick={() => void keep(highlight)} className={clsx("rounded-md px-2 py-1 text-xs text-muted", "hover:bg-ink/5 hover:text-ink", "disabled:opacity-50")}>
                              Keep
                            </button>
                          )}
                          <button type="button" disabled={busyId === highlight.id} onClick={() => void remove(highlight)} aria-label="Remove highlight" title="Remove highlight" className={clsx("rounded-md px-2 py-1 text-xs text-muted", "hover:bg-ink/5 hover:text-ink", "disabled:opacity-50")}>
                            {busyId === highlight.id ? "…" : "Remove"}
                          </button>
                        </div>
                      </div>
                      {highlight.orphaned_at && (
                        <Caption tone="muted" className={clsx("mt-2")}>This passage changed since it was highlighted. Keep it as a note, or remove it.</Caption>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
      <Caption tone="muted" className={clsx("mt-8 border-t border-ink/10 pt-4")}>Removing a highlight here also un-highlights it on its page.</Caption>
    </div>
  );
}
