import { completionStatusLabels } from "@/features/courses/lib/completion-status";
import { pageTypeLabel } from "@/features/courses/lib/page-type/pageTypesState";
import { getPages } from "@/features/courses/lib/page/actions";
import type { Page } from "@/features/courses/lib/page/types";
import { Caption } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { statusMarkerStyles } from "./StatusPicker";

// A module's pages, listed under its row on the course page while expanded.
export default function ModulePages({
  id,
  courseId,
  moduleId
}: Readonly<{ id: string; courseId: number; moduleId: number }>) {
  const [pages, setPages] = useState<Page[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getPages(moduleId)
      .then((loaded) => active && setPages(loaded))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [moduleId]);

  if (failed)
    return (
      <Caption id={id} role="alert" tone="error" className={clsx("mt-3")}>
        Couldn’t load this module’s pages. Open the module to see them.
      </Caption>
    );
  if (pages === null)
    return (
      <Caption id={id} role="status" tone="muted" className={clsx("mt-3")}>
        Loading pages…
      </Caption>
    );
  if (pages.length === 0)
    return (
      <Caption id={id} tone="muted" className={clsx("mt-3")}>
        No pages yet.
      </Caption>
    );

  return (
    <ul id={id} className={clsx("relative z-10 mt-3 border-l border-ink/10")}>
      {pages.map((page) => (
        <li key={page.id}>
          <Link
            to={`/courses/${courseId}/modules/${moduleId}/pages/${page.id}`}
            className={clsx(
              "flex items-center gap-3 rounded-r-md",
              "py-1.5 pr-2 pl-3 text-sm",
              "hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-ink"
            )}
          >
            <span
              aria-hidden="true"
              className={clsx("size-2 shrink-0 rounded-full", statusMarkerStyles[page.status])}
            />
            <span className={clsx("min-w-0 flex-1 truncate")}>
              {page.title}
              <span className={clsx("sr-only")}>, {completionStatusLabels[page.status]}</span>
            </span>
            <Caption as="span" tone="muted" className={clsx("shrink-0")}>
              {pageTypeLabel(page.type)}
            </Caption>
          </Link>
        </li>
      ))}
    </ul>
  );
}
