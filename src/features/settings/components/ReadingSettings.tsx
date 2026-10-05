import clsx from "clsx";

import { pageFontOptions, textSizeOptions, type Appearance } from "../../../shared/lib/appearance";
import { useAppearance } from "../../../shared/providers/AppearanceProvider";
import { BodyText, SectionTitle } from "../../../shared/ui/Typography";
import OptionCards from "./OptionCards";

export default function ReadingSettings() {
  const { appearance, changeAppearance } = useAppearance();
  return (
    <section
      aria-labelledby="reading-title"
      className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}
    >
      <div>
        <SectionTitle id="reading-title">Reading</SectionTitle>
        <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>
          The font and size of your pages’ text. Saved on this device.
        </BodyText>
      </div>
      <div className={clsx("min-w-0 w-full max-w-xl space-y-6 @min-3xl:col-span-2")}>
        <OptionCards<Appearance["pageFont"]>
          legend="Page font"
          value={appearance.pageFont}
          onChange={(pageFont) => changeAppearance({ pageFont })}
          options={pageFontOptions.map(({ value, label }) => ({
            value,
            label,
            preview: (
              <div data-page-font={value} className={clsx("flex h-full flex-col justify-center px-3")} style={{ fontFamily: "var(--page-font)" }}>
                <span className={clsx("text-3xl leading-none")}>Ag</span>
                <span className={clsx("mt-2 truncate text-xs text-muted")}>Key terms</span>
              </div>
            )
          }))}
        />
        <OptionCards<Appearance["textSize"]>
          legend="Text size"
          value={appearance.textSize}
          onChange={(textSize) => changeAppearance({ textSize })}
          options={textSizeOptions.map(({ value, label }) => ({
            value,
            label,
            preview: (
              <div data-text-size={value} className={clsx("flex h-full items-end px-3 pb-2.5")}>
                <span className={clsx("leading-none")} style={{ fontSize: "calc(var(--page-text) * 2)" }}>
                  Aa
                </span>
              </div>
            )
          }))}
        />
      </div>
    </section>
  );
}
