import type { Page } from "@/features/courses/lib/page/types";
import clsx from "clsx";
import { Link } from "react-router-dom";

export default function PageLinks({
  pages,
  pagePath
}: Readonly<{ pages: Page[]; pagePath: (pageId: number) => string }>) {
  return pages.map((page, index) => (
    <span key={page.id}>
      {index > 0 && ", "}
      <Link to={pagePath(page.id)} className={clsx("underline underline-offset-4 hover:text-ink")}>
        {page.title}
      </Link>
    </span>
  ));
}
