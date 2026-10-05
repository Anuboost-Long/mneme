import clsx from "clsx";
import type { CSSProperties } from "react";

import { isFileReference } from "../lib/fileReference";
import { useFileUrl } from "../lib/useFileUrl";
import { iconChoices } from "./iconCatalogue";

export const courseColors = [
  { name: "Navy", value: "#171b24" },
  { name: "Fern", value: "#52745b" },
  { name: "Ocean", value: "#426d91" },
  { name: "Iris", value: "#79649a" },
  { name: "Ochre", value: "#956b2f" },
  { name: "Rose", value: "#a35b70" },
] as const;

const sizes = {
  small: { box: "size-6", text: "text-sm", glyph: "size-3.5" },
  base: { box: "size-8", text: "text-base", glyph: "size-4" },
  large: { box: "size-16", text: "text-3xl", glyph: "size-8" },
};

export default function CourseIcon({ icon, color, large = false, small = false }: Readonly<{
  icon?: string | null;
  color?: string | null;
  large?: boolean;
  small?: boolean;
}>) {
  const size = (large && "large") || (small && "small") || "base";
  const fileUrl = useFileUrl(isFileReference(icon) ? icon : null);
  const picture = isFileReference(icon) ? fileUrl : icon?.startsWith("data:image/png;base64,") && icon;

  function glyph() {
    if (picture) return <img src={picture} alt="" className={clsx("size-full rounded-md object-contain")} />;
    if (isFileReference(icon)) return null;
    const choice = iconChoices.get(icon || "book");
    if (!choice) return <span className={clsx("truncate", sizes[size].text)}>{icon}</span>;
    return <choice.Icon className={clsx(sizes[size].glyph)} strokeWidth={1.6} aria-hidden="true" />;
  }

  return (
    <span
      className={clsx("course-icon inline-flex shrink-0 items-center justify-center rounded-md", sizes[size].box)}
      style={{ "--course-color": color?.match(/^#[0-9a-f]{6}$/i) ? color : courseColors[0].value } as CSSProperties}
    >
      {glyph()}
    </span>
  );
}
