import clsx from "clsx";
import { useEffect, useState } from "react";

import { Caption } from "../../../shared/ui/Typography";
import { pageContentPreview } from "../../courses/lib/page/types";
import { getDeletedPages, type DeletedItem, type DeletedPage } from "../lib/recentlyDeleted";

function groupByModule(pages: DeletedPage[]) {
  const groups = new Map<number, DeletedPage[]>();
  for (const page of pages) groups.set(page.module_id, [...(groups.get(page.module_id) ?? []), page]);
  return [...groups.values()];
}

function PageList({ pages }: Readonly<{ pages: DeletedPage[] }>) {
  const listed = pages.filter((page) => page.id !== null);
  if (listed.length === 0) return <Caption tone="muted">No pages.</Caption>;
  return (
    <ul className={clsx("space-y-2")}>
      {listed.map((page) => (
        <li key={page.id} className={clsx("min-w-0")}>
          <span className={clsx("block truncate text-sm")}>{page.title}</span>
          <Caption as="span" tone="muted" className={clsx("block truncate")}>{pageContentPreview(page.content) || "Empty page"}</Caption>
        </li>
      ))}
    </ul>
  );
}

export default function DeletedItemPreview({ item }: Readonly<{ item: DeletedItem }>) {
  const [pages, setPages] = useState<DeletedPage[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getDeletedPages(item)
      .then((loaded) => active && setPages(loaded))
      .catch(() => active && setFailed(true));
    return () => { active = false; };
  }, [item]);

  if (failed) return <Caption tone="error">Couldn’t load the preview. Close it and try again.</Caption>;
  if (!pages) return <Caption tone="muted">Loading…</Caption>;

  switch (item.kind) {
    case "page": {
      const content = pages[0]?.content;
      return content
        ? <div className={clsx("page-editor-content max-h-96 overflow-y-auto wrap-anywhere")} dangerouslySetInnerHTML={{ __html: content }} />
        : <Caption tone="muted">This page is empty.</Caption>;
    }
    case "module":
      return <PageList pages={pages} />;
    case "course": {
      if (pages.length === 0) return <Caption tone="muted">No modules.</Caption>;
      return (
        <div className={clsx("space-y-4")}>
          {groupByModule(pages).map((modulePages) => (
            <section key={modulePages[0].module_id} aria-label={modulePages[0].module_name}>
              <Caption as="h3" tone="muted" className={clsx("mb-1.5 font-medium")}>{modulePages[0].module_name}</Caption>
              <PageList pages={modulePages} />
            </section>
          ))}
        </div>
      );
    }
  }
}
