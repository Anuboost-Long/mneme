import {
  formatDueDate,
  type DueDate,
  type LinkedFile
} from "@/features/courses/lib/content-detection";
import { Caption, Typography } from "@/shared/ui/Typography";
import clsx from "clsx";
import type { ReactNode } from "react";

export type Picked<T> = { value: T; picked: boolean };

export type Findings = {
  dueDates: Picked<DueDate>[];
  activities: Picked<string>[];
  files: Picked<LinkedFile>[];
};

export const pickAll = <T,>(values: T[]): Picked<T>[] =>
  values.map((value) => ({ value, picked: true }));

export const pickedValues = <T,>(items: Picked<T>[]): T[] =>
  items.filter((item) => item.picked).map((item) => item.value);

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function FindingGroup<T>({
  legend,
  items,
  keyOf,
  onChange,
  children
}: Readonly<{
  legend: string;
  items: Picked<T>[];
  keyOf: (value: T) => string;
  onChange: (items: Picked<T>[]) => void;
  children: (value: T) => ReactNode;
}>) {
  if (items.length === 0) return null;
  return (
    <fieldset className={clsx("min-w-0 space-y-2")}>
      <legend>
        <Typography as="span" variant="label">
          {legend}
        </Typography>
      </legend>
      <ul
        className={clsx(
          "max-h-40 divide-y divide-ink/10 overflow-y-auto rounded-md border border-ink/15"
        )}
      >
        {items.map((item, index) => (
          <li key={keyOf(item.value)}>
            <label className={clsx("flex cursor-pointer items-start gap-3 px-3 py-2 text-sm")}>
              <input
                type="checkbox"
                checked={item.picked}
                onChange={() =>
                  onChange(
                    items.map((other, otherIndex) =>
                      otherIndex === index ? { ...other, picked: !other.picked } : other
                    )
                  )
                }
                className={clsx("mt-0.5 accent-current")}
              />
              <span className={clsx("min-w-0 wrap-anywhere")}>{children(item.value)}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

export default function ImportFindings({
  findings,
  onChange
}: Readonly<{ findings: Findings; onChange: (findings: Findings) => void }>) {
  const { dueDates, activities, files } = findings;
  if (dueDates.length + activities.length + files.length === 0) return null;
  return (
    <div className={clsx("space-y-4")}>
      <Caption tone="muted">
        Ticked items are listed at the top of the page, and ticked activities are added to Tasks.
      </Caption>
      <FindingGroup
        legend="Due dates"
        items={dueDates}
        keyOf={({ text }) => text}
        onChange={(items) => onChange({ ...findings, dueDates: items })}
      >
        {({ text, date }) => (
          <>
            {text}
            {date && (
              <Caption as="span" tone="muted" className={clsx("block")}>
                Read as {formatDueDate(date)}
              </Caption>
            )}
          </>
        )}
      </FindingGroup>
      <FindingGroup
        legend="Activities"
        items={activities}
        keyOf={(name) => name}
        onChange={(items) => onChange({ ...findings, activities: items })}
      >
        {(name) => name}
      </FindingGroup>
      <FindingGroup
        legend="Files"
        items={files}
        keyOf={({ url }) => url}
        onChange={(items) => onChange({ ...findings, files: items })}
      >
        {({ name, url }) => (
          <>
            {name}
            <Caption as="span" tone="muted" className={clsx("block")}>
              {hostOf(url)}
            </Caption>
          </>
        )}
      </FindingGroup>
    </div>
  );
}
