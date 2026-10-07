import { getCourseShelf, getLibraryCounts } from "@/features/home/lib/dashboard/actions";
import type { ShelfCourse } from "@/features/home/lib/dashboard/types";
import { useWidgetData } from "@/features/home/lib/useWidgetData";
import { courseColors } from "@/shared/ui/CourseIcon";
import { Caption } from "@/shared/ui/Typography";
import clsx from "clsx";
import { Link } from "react-router-dom";

import { WidgetNote } from "./parts";
import type { WidgetProps } from "./types";

const plural = (count: number, one: string) =>
  `${count.toLocaleString()} ${one}${count === 1 ? "" : "s"}`;

const shelfSize = { small: 4, medium: 9, wide: 18, large: 9 } as const;

function spineColor(color: string | null) {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : courseColors[0].value;
}

// Light custom colours need dark lettering; the preset colours are all dark.
function isLight(hex: string) {
  const [red, green, blue] = [1, 3, 5].map((start) =>
    Number.parseInt(hex.slice(start, start + 2), 16)
  );
  return 0.299 * red + 0.587 * green + 0.114 * blue > 160;
}

// Thicker and taller with more pages, within limits so an empty course is
// still a book and a huge one doesn't crowd out the shelf.
function spineShape(course: ShelfCourse, most: number) {
  const share = most ? course.pages / most : 0;
  return { width: `${1.25 + share * 1}rem`, height: `${58 + share * 42}%` };
}

function Spine({
  course,
  most,
  leaning
}: Readonly<{ course: ShelfCourse; most: number; leaning: boolean }>) {
  const color = spineColor(course.color);
  const done = course.pages ? Math.round((course.done / course.pages) * 100) : 0;
  return (
    <Link
      to={`/courses/${course.id}`}
      title={`${course.name}: ${plural(course.pages, "page")}, ${done}% done`}
      aria-label={`${course.name}, ${plural(course.pages, "page")}, ${done}% done`}
      style={{ ...spineShape(course, most), backgroundColor: color }}
      className={clsx(
        "relative flex shrink-0 origin-bottom-left justify-center overflow-hidden rounded-t-sm rounded-b-xs",
        isLight(color) ? "text-chain-navy" : "text-white",
        "transition-transform duration-150 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none",
        leaning && "ml-1.5 rotate-6"
      )}
    >
      <span
        aria-hidden="true"
        style={{ height: `${done}%` }}
        className={clsx("absolute inset-x-0 bottom-0 bg-white/18")}
      />
      <span
        aria-hidden="true"
        className={clsx("absolute inset-x-0 top-1.5 h-px bg-current opacity-35")}
      />
      <span
        className={clsx(
          "relative mt-3 mb-1.5 truncate text-[10px] leading-none font-semibold tracking-wide [writing-mode:vertical-rl]"
        )}
      >
        {course.name}
      </span>
    </Link>
  );
}

// Library as a bookshelf: each course a spine in its colour, sized by its
// pages, filled from the bottom as its pages get done.
export function BookshelfWidget({ widget }: Readonly<WidgetProps>) {
  const shelf = useWidgetData(getCourseShelf, "shelf");
  const counts = useWidgetData(getLibraryCounts, "library");
  if (!shelf || !counts) return null;
  if (shelf.length === 0) return <WidgetNote>Your courses line up here as books.</WidgetNote>;
  const shown = shelf.slice(0, shelfSize[widget.size]);
  const most = Math.max(...shelf.map((course) => course.pages));
  const hidden = shelf.length - shown.length;
  const extras =
    widget.size === "small"
      ? []
      : [
          plural(counts.modules, "module"),
          plural(counts.recordings, "recording"),
          plural(counts.attachments, "file")
        ];

  return (
    <div className={clsx("flex h-full flex-col px-3 pb-2")}>
      <div className={clsx("flex min-h-0 flex-1 items-end gap-1 pl-1")}>
        {shown.map((course, index) => (
          <Spine
            key={course.id}
            course={course}
            most={most}
            leaning={shown.length > 1 && index === shown.length - 1}
          />
        ))}
        {hidden > 0 && (
          <Caption as="span" tone="muted" className={clsx("mb-1 ml-3 shrink-0")}>
            +{hidden}
          </Caption>
        )}
      </div>
      <div aria-hidden="true" className={clsx("h-1.5 rounded-full bg-ink/15")} />
      <Caption tone="muted" className={clsx("mt-1.5 truncate")}>
        {[plural(counts.courses, "course"), plural(counts.pages, "page"), ...extras].join(" · ")}
      </Caption>
    </div>
  );
}
