import clsx from "clsx";
import { useState } from "react";

import Dialog from "../../../shared/ui/Dialog";
import { BodyText } from "../../../shared/ui/Typography";
import type { Course } from "../../courses/lib/course/types";
import type { NewWidget, WidgetSize } from "../lib/widget/types";
import { newWidget, widgetCatalog, widgetTitle } from "../widgets/catalog";
import { widgetCategories } from "../widgets/types";
import { sizeLabels } from "./WidgetFrame";

// The preview is drawn at the widget's real size on Home's grid.
const previewBoxes: Record<WidgetSize, string> = {
  small: "h-40 w-44",
  medium: "h-40 w-88 max-w-full",
  wide: "h-40 w-full",
  large: "h-84 w-88 max-w-full"
};

export default function WidgetGallery({
  courses,
  onAdd,
  onClose
}: Readonly<{
  courses: Course[];
  onAdd: (widget: NewWidget) => void;
  onClose: () => void;
}>) {
  const [selected, setSelected] = useState(widgetCatalog[0]);
  const [size, setSize] = useState<WidgetSize>(selected.defaultSize);
  const preview = { id: -1, ...newWidget(selected, size) };

  function choose(kind: string) {
    const definition = widgetCatalog.find((item) => item.kind === kind);
    if (!definition) return;
    setSelected(definition);
    setSize(definition.defaultSize);
  }

  return (
    <Dialog title="Add a widget" wide onClose={onClose}>
      {(close, complete) => (
        <div className={clsx("grid gap-6 sm:grid-cols-[13rem_minmax(0,1fr)]")}>
          <nav
            aria-label="Widgets"
            className={clsx(
              "max-h-112 space-y-4 overflow-y-auto sm:border-r sm:border-ink/10 sm:pr-4"
            )}
          >
            {widgetCategories.map((category) => (
              <section key={category} aria-label={category}>
                <h3 className={clsx("px-2 text-xs font-medium text-muted")}>{category}</h3>
                <ul className={clsx("mt-1 space-y-0.5")}>
                  {widgetCatalog
                    .filter((definition) => definition.category === category)
                    .map((definition) => (
                      <li key={definition.kind}>
                        <button
                          type="button"
                          aria-current={definition.kind === selected.kind}
                          onClick={() => choose(definition.kind)}
                          className={clsx(
                            "flex h-8 w-full items-center rounded-md px-2 text-left text-sm",
                            definition.kind === selected.kind
                              ? "bg-ink/8 font-medium"
                              : "hover:bg-ink/4",
                            "focus-visible:outline-1 focus-visible:outline-ink"
                          )}
                        >
                          {definition.name}
                        </button>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </nav>

          <div className={clsx("flex min-w-0 flex-col gap-4")}>
            <div>
              <h3 className={clsx("text-base font-semibold")}>{selected.name}</h3>
              <BodyText tone="muted">{selected.description}</BodyText>
            </div>
            <div
              className={clsx("@container flex min-h-84 items-start rounded-lg p-4", "bg-ink/4")}
            >
              <article
                aria-label={`${selected.name} preview`}
                className={clsx(
                  "flex flex-col overflow-hidden rounded-lg",
                  "border border-ink/10 bg-surface",
                  previewBoxes[size]
                )}
              >
                <p
                  className={clsx(
                    "flex h-9 shrink-0 items-center px-3 text-xs font-medium text-muted"
                  )}
                >
                  {widgetTitle(selected, preview.config, courses)}
                </p>
                <div inert className={clsx("min-h-0 flex-1 overflow-hidden")}>
                  {selected.render({
                    widget: preview,
                    courses,
                    editing: false,
                    onConfig: () => undefined
                  })}
                </div>
              </article>
            </div>
            <div className={clsx("flex flex-wrap items-center justify-between gap-3")}>
              <fieldset className={clsx("flex gap-1")}>
                <legend className={clsx("sr-only")}>Size</legend>
                {selected.sizes.map((option) => (
                  <label
                    key={option}
                    className={clsx(
                      "flex h-8 cursor-pointer items-center rounded-md px-3 text-sm",
                      "border",
                      option === size
                        ? "border-ink/40 bg-ink/6 font-medium"
                        : "border-ink/15 hover:bg-ink/4",
                      "has-focus-visible:outline-1 has-focus-visible:outline-ink"
                    )}
                  >
                    <input
                      type="radio"
                      name="widget-size"
                      value={option}
                      checked={option === size}
                      onChange={() => setSize(option)}
                      className={clsx("sr-only")}
                    />
                    {sizeLabels[option]}
                  </label>
                ))}
              </fieldset>
              <div className={clsx("flex gap-3")}>
                <button
                  type="button"
                  onClick={close}
                  className={clsx(
                    "rounded-md border border-ink/15 px-4 py-2 text-sm",
                    "hover:bg-ink/5"
                  )}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAdd(newWidget(selected, size));
                    complete(onClose);
                  }}
                  className={clsx(
                    "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                    "hover:bg-action/85"
                  )}
                >
                  Add widget
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
