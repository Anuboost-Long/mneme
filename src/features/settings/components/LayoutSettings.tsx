import type { Appearance } from "@/shared/lib/appearance";
import { useAppearance } from "@/shared/providers/AppearanceProvider";
import { BodyText, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";

import OptionCards from "./OptionCards";

const line = (width: string, strong = false) => (
  <div className={clsx("h-1 rounded-sm", width, strong ? "bg-ink/30" : "bg-ink/12")} />
);

function SidebarPreview({ width }: Readonly<{ width: string }>) {
  return (
    <div className={clsx("flex h-full")}>
      <div className={clsx("h-full space-y-1.5 border-r border-ink/10 bg-sidebar p-1.5", width)}>
        {line("w-full")}
        {line("w-3/4")}
        {line("w-full")}
      </div>
      <div className={clsx("flex-1 space-y-1.5 p-2")}>
        {line("w-2/3", true)}
        {line("w-full")}
        {line("w-5/6")}
      </div>
    </div>
  );
}

function PageWidthPreview({ width }: Readonly<{ width: string }>) {
  return (
    <div className={clsx("space-y-1.5 p-2.5")}>
      <div className={clsx("space-y-1.5", width)}>
        {line("w-1/2", true)}
        {line("w-full")}
        {line("w-full")}
        {line("w-11/12")}
        {line("w-full")}
      </div>
    </div>
  );
}

const DENSITY_ROWS = ["first", "second", "third", "fourth", "fifth", "sixth"];

function DensityPreview({ compact }: Readonly<{ compact: boolean }>) {
  return (
    <div className={clsx("flex flex-col p-2", compact ? "gap-1.5" : "gap-3")}>
      {DENSITY_ROWS.slice(0, compact ? 6 : 4).map((row, index) => (
        <div key={row} className={clsx("flex items-center gap-1.5")}>
          <div className={clsx("size-1.5 shrink-0 rounded-full bg-ink/25")} />
          {line(index % 2 ? "w-3/4" : "w-full")}
        </div>
      ))}
    </div>
  );
}

export default function LayoutSettings() {
  const { appearance, changeAppearance } = useAppearance();
  return (
    <section
      aria-labelledby="layout-title"
      className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}
    >
      <div>
        <SectionTitle id="layout-title">Layout</SectionTitle>
        <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>
          How much room the sidebar and your pages take. Saved on this device.
        </BodyText>
      </div>
      <div className={clsx("min-w-0 w-full max-w-xl space-y-6 @min-3xl:col-span-2")}>
        <OptionCards<Appearance["sidebar"]>
          legend="Sidebar width"
          value={appearance.sidebar}
          onChange={(sidebar) => changeAppearance({ sidebar })}
          options={[
            { value: "narrow", label: "Narrow", preview: <SidebarPreview width="w-1/5" /> },
            { value: "standard", label: "Standard", preview: <SidebarPreview width="w-1/4" /> },
            { value: "wide", label: "Wide", preview: <SidebarPreview width="w-1/3" /> }
          ]}
        />
        <OptionCards<Appearance["pageWidth"]>
          legend="Page width"
          value={appearance.pageWidth}
          onChange={(pageWidth) => changeAppearance({ pageWidth })}
          options={[
            { value: "full", label: "Full width", preview: <PageWidthPreview width="w-full" /> },
            { value: "wide", label: "Wide", preview: <PageWidthPreview width="w-4/5" /> },
            { value: "readable", label: "Readable", preview: <PageWidthPreview width="w-3/5" /> }
          ]}
        />
        <OptionCards<"comfortable" | "compact">
          legend="Density"
          value={appearance.compact ? "compact" : "comfortable"}
          onChange={(density) => changeAppearance({ compact: density === "compact" })}
          options={[
            {
              value: "comfortable",
              label: "Comfortable",
              preview: <DensityPreview compact={false} />
            },
            { value: "compact", label: "Compact", preview: <DensityPreview compact /> }
          ]}
        />
      </div>
    </section>
  );
}
