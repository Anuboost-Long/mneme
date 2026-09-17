import clsx from "clsx";
import type { CSSProperties } from "react";

export const courseColors = [
  { name: "Navy", value: "#171b24" },
  { name: "Fern", value: "#52745b" },
  { name: "Ocean", value: "#426d91" },
  { name: "Iris", value: "#79649a" },
  { name: "Ochre", value: "#956b2f" },
  { name: "Rose", value: "#a35b70" },
] as const;

export const courseIcons = ["book", "science", "code", "globe", "art", "music"] as const;

const paths: Record<string, string> = {
  book: "M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1m0-15c3-2 7-2 9-1v15c-3-1-6-1-9 1V5Z",
  science: "M9 3h6M10 3v7l-6 9a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3M7 15h10",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16",
  globe: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z",
  art: "M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4 2 2 0 0 1 1-4h3a3 3 0 0 0 3-3c0-4-4-7-9-7ZM7 9h.01M11 6h.01M16 7h.01M6 14h.01",
  music: "M9 18V5l11-2v13M9 8l11-2M9 18a3 2 0 1 1-6 0 3 2 0 0 1 6 0Zm11-2a3 2 0 1 1-6 0 3 2 0 0 1 6 0Z",
};

export default function CourseIcon({ icon, color, large = false }: Readonly<{
  icon?: string | null;
  color?: string | null;
  large?: boolean;
}>) {
  return (
    <span
      className={clsx("course-icon inline-flex shrink-0 items-center justify-center rounded-md", large ? "size-16" : "size-8")}
      style={{ "--course-color": color?.match(/^#[0-9a-f]{6}$/i) ? color : courseColors[0].value } as CSSProperties}
    >
      {icon?.startsWith("data:image/png;base64,") ? <img src={icon} alt="" className={clsx("size-full rounded-md object-contain")} /> : icon && !paths[icon] ? <span className={clsx("truncate", large ? "text-3xl" : "text-base")}>{icon}</span> : (
        <svg className={clsx(large ? "size-8" : "size-4")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={paths[icon || "book"]} />
        </svg>
      )}
    </span>
  );
}
