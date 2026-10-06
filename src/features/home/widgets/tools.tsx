import { getPagesByIds } from "@/features/home/lib/dashboard/actions";
import { useWidgetData } from "@/features/home/lib/useWidgetData";
import CourseIcon from "@/shared/ui/CourseIcon";
import { Caption } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState } from "react";

import { PageGlyph, pageLink, RowLink, Rows, rowsFor, WidgetNote } from "./parts";
import type { WidgetProps } from "./types";

export type QuickLink = { kind: "course" | "page"; id: number };

export function quickLinks(config: Record<string, unknown>): QuickLink[] {
  return Array.isArray(config.links)
    ? (config.links as QuickLink[]).filter(
        (link) => link && (link.kind === "course" || link.kind === "page")
      )
    : [];
}

// Saved as it's typed, once the typing pauses, like the page editor.
export function NoteWidget({ widget, onConfig }: Readonly<WidgetProps>) {
  const saved = typeof widget.config.text === "string" ? widget.config.text : "";
  const [text, setText] = useState(saved);

  useEffect(() => {
    if (text === saved) return;
    const timer = setTimeout(() => onConfig({ ...widget.config, text }), 600);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <textarea
      value={text}
      onChange={(event) => setText(event.target.value)}
      placeholder="Write a note to yourself…"
      aria-label={
        typeof widget.config.title === "string" && widget.config.title
          ? widget.config.title
          : "Note"
      }
      className={clsx(
        "size-full resize-none",
        "bg-transparent",
        "px-3 pb-3 text-sm leading-6",
        "placeholder:text-muted focus-visible:outline-none"
      )}
    />
  );
}

export function LinksWidget({ widget, courses }: Readonly<WidgetProps>) {
  const links = quickLinks(widget.config);
  const pageIds = links.filter((link) => link.kind === "page").map((link) => link.id);
  const pages = useWidgetData(() => getPagesByIds(pageIds), pageIds.join(","));
  if (links.length === 0)
    return <WidgetNote>Add pages and courses in this widget’s settings.</WidgetNote>;
  if (!pages) return null;
  const rows = links.slice(0, rowsFor(widget.size)).flatMap((link) => {
    if (link.kind === "course") {
      const course = courses.find((item) => item.id === link.id);
      return course
        ? [
            {
              key: `course-${course.id}`,
              to: `/courses/${course.id}`,
              label: course.name,
              detail: "Course",
              icon: <CourseIcon icon={course.icon} color={course.color} small />
            }
          ]
        : [];
    }
    const page = pages.find((item) => item.id === link.id);
    return page
      ? [
          {
            key: `page-${page.id}`,
            to: pageLink(page),
            label: page.title,
            detail: page.course_name,
            icon: <PageGlyph page={page} />
          }
        ]
      : [];
  });
  return (
    <Rows>
      {rows.map((row) => (
        <RowLink key={row.key} to={row.to}>
          {row.icon}
          <span className={clsx("min-w-0 flex-1 truncate font-medium")}>{row.label}</span>
          {widget.size !== "small" && (
            <Caption as="span" tone="muted" className={clsx("max-w-40 truncate")}>
              {row.detail}
            </Caption>
          )}
        </RowLink>
      ))}
    </Rows>
  );
}
