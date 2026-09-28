import clsx from "clsx";

export type RowActionTone = "neutral" | "edit" | "create" | "danger";

const tones: Record<RowActionTone, string> = {
  neutral: "hover:bg-ink/5 hover:text-ink",
  edit: "hover:bg-info/10 hover:text-info",
  create: "hover:bg-success/10 hover:text-success",
  danger: "hover:bg-danger/10 hover:text-danger",
};

export function rowAction(tone: RowActionTone = "neutral") {
  return clsx("rounded-md px-2 py-1 text-xs text-muted", tones[tone], "disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted");
}
