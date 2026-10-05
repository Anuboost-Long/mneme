import clsx from "clsx";
import { useId, type ReactNode } from "react";

import { Typography } from "../../../shared/ui/Typography";

export type OptionCard<T extends string> = { value: T; label: string; preview: ReactNode };

const columns = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" } as const;

export default function OptionCards<T extends string>({
  legend,
  value,
  options,
  onChange
}: Readonly<{ legend: string; value: T; options: OptionCard<T>[]; onChange: (value: T) => void }>) {
  const name = useId();
  return (
    <fieldset>
      <Typography as="legend" variant="label" className={clsx("mb-3")}>
        {legend}
      </Typography>
      <div className={clsx("grid gap-3", columns[options.length as keyof typeof columns])}>
        {options.map((option) => (
          <label
            key={option.value}
            className={clsx(
              "relative min-w-0 cursor-pointer rounded-lg",
              "border border-ink/15 bg-sidebar p-2.5",
              "hover:border-ink/35 has-checked:outline-2 has-checked:outline-ink has-focus-visible:outline-offset-4"
            )}
          >
            <div aria-hidden="true" className={clsx("h-20 overflow-hidden rounded border border-ink/10 bg-surface")}>
              {option.preview}
            </div>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className={clsx("sr-only")}
            />
            <Typography as="span" variant="label" className={clsx("mt-2.5 block truncate")}>
              {option.label}
            </Typography>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
