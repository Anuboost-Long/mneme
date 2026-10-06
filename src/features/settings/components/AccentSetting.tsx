import { accentOptions } from "@/shared/lib/appearance";
import { useAppearance } from "@/shared/providers/AppearanceProvider";
import { Typography } from "@/shared/ui/Typography";
import clsx from "clsx";

export default function AccentSetting() {
  const { appearance, changeAppearance } = useAppearance();
  return (
    <fieldset className={clsx("mt-6")}>
      <Typography as="legend" variant="label" className={clsx("mb-3")}>
        Accent colour
      </Typography>
      <div className={clsx("flex flex-wrap gap-3")}>
        {accentOptions.map((accent) => (
          <label
            key={accent.value}
            className={clsx(
              "flex cursor-pointer items-center gap-2 rounded-md border border-ink/15 py-1.5 pr-3 pl-1.5",
              "hover:border-ink/35 has-checked:outline-2 has-checked:outline-ink has-focus-visible:outline-offset-2"
            )}
          >
            <input
              type="radio"
              name="accent"
              value={accent.value}
              checked={appearance.accent === accent.value}
              onChange={() => changeAppearance({ accent: accent.value })}
              className={clsx("sr-only")}
            />
            <span
              aria-hidden="true"
              className={clsx("flex overflow-hidden rounded ring-1 ring-ink/20")}
            >
              <span className={clsx("size-5")} style={{ background: accent.light }} />
              <span className={clsx("size-5")} style={{ background: accent.dark }} />
            </span>
            <span className={clsx("text-sm")}>{accent.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
