import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";

import CourseIcon, { courseColors } from "../../../shared/ui/CourseIcon";
import { Caption } from "../../../shared/ui/Typography";
import { typeGlyphs } from "../../courses/components/pageDisplay";
import type { PageType } from "../../courses/lib/page/types";
import type { WidgetSize } from "../lib/widgets";

// How many 36px rows fit in a widget of this size.
export function rowsFor(size: WidgetSize) {
  return size === "large" ? 8 : 3;
}

export const pageLink = (page: { id: number; module_id: number; course_id: number }) =>
  `/courses/${page.course_id}/modules/${page.module_id}/pages/${page.id}`;

export const rowLink = clsx("flex h-9 items-center gap-3 px-3 text-sm", "hover:bg-ink/4 focus-visible:bg-ink/4 focus-visible:outline-none");

export function tint(color: string | null | undefined) {
  return { "--course-color": /^#[0-9a-f]{6}$/i.test(color ?? "") ? color : courseColors[0].value } as CSSProperties;
}

export function Rows({ children }: Readonly<{ children: ReactNode }>) {
  return <ul className={clsx("divide-y divide-ink/10")}>{children}</ul>;
}

export function WidgetNote({ children }: Readonly<{ children: ReactNode }>) {
  return <Caption tone="muted" className={clsx("px-3 py-2")}>{children}</Caption>;
}

export function PageGlyph({ page }: Readonly<{ page: { icon: string | null; type: PageType; course_color: string | null } }>) {
  if (page.icon) return <CourseIcon icon={page.icon} color={page.course_color} small />;
  return (
    <span style={tint(page.course_color)} className={clsx("course-icon inline-flex size-6 shrink-0 items-center justify-center rounded-md")}>
      <svg className={clsx("size-3.5")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={typeGlyphs[page.type]} />
      </svg>
    </span>
  );
}

export function ProgressLine({ progress, label }: Readonly<{ progress: number; label: string }>) {
  return (
    <progress value={progress} max={100} aria-label={label} className={clsx(
      "block h-1 w-full appearance-none overflow-hidden rounded-full bg-ink/10",
      "[&::-webkit-progress-bar]:bg-ink/10 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-ink/60 [&::-moz-progress-bar]:bg-ink/60",
    )} />
  );
}

// One big number with what it counts; `detail` is a quieter second line.
export function Stat({ value, label, detail }: Readonly<{ value: ReactNode; label: string; detail?: ReactNode }>) {
  return (
    <div className={clsx("flex h-full flex-col justify-end px-3 pb-3")}>
      <p className={clsx("text-3xl font-semibold tracking-tight tabular-nums")}>{value}</p>
      <p className={clsx("text-sm")}>{label}</p>
      {detail && <Caption tone="muted" className={clsx("truncate")}>{detail}</Caption>}
    </div>
  );
}

export function RowLink({ to, children }: Readonly<{ to: string; children: ReactNode }>) {
  return (
    <li>
      <Link to={to} className={rowLink}>{children}</Link>
    </li>
  );
}
