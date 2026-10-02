import clsx from "clsx";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useDragReorder } from "../../../shared/lib/useDragReorder";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import type { Course } from "../../courses/lib/course/types";
import LayoutsDialog from "../components/LayoutsDialog";
import WidgetFrame from "../components/WidgetFrame";
import WidgetGallery from "../components/WidgetGallery";
import WidgetSettings from "../components/WidgetSettings";
import type { NewWidget, Widget, WidgetSize } from "../lib/widget/types";
import { widgetDefinitions, widgetTitle } from "../widgets/catalog";

const UNDO_VISIBLE_MS = 8000;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const resizeAnimation: KeyframeAnimationOptions = {
  duration: 280,
  easing: "cubic-bezier(0.2, 0, 0, 1)"
};

// Every card's box, relative to the page, keyed by widget id.
function cardBoxes(grid: HTMLElement) {
  return new Map(
    Array.from(
      grid.children,
      (card) =>
        [Number((card as HTMLElement).dataset.widgetId), card.getBoundingClientRect()] as const
    )
  );
}

const secondaryButton = clsx(
  "h-8 rounded-md",
  "border border-ink/20 bg-surface",
  "px-3 text-sm",
  "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-ink"
);
const primaryButton = clsx(
  "h-8 rounded-md",
  "bg-action text-on-action",
  "px-3 text-sm font-medium",
  "hover:bg-action/85 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
);

export default function HomePage({
  courses,
  widgets,
  onCreateCourse,
  onAdd,
  onUpdate,
  onRemove,
  onReorder,
  onBeautify,
  onApplyLayout
}: Readonly<{
  courses: Course[];
  widgets: Widget[] | null;
  onCreateCourse: () => void;
  onAdd: (widget: NewWidget) => Promise<void>;
  onUpdate: (widget: Widget) => void;
  onRemove: (widget: Widget) => () => void;
  onReorder: (widgets: Widget[]) => void;
  onBeautify: () => Promise<{ name: string; undo: () => Promise<void> }>;
  onApplyLayout: (name: string, widgets: NewWidget[]) => Promise<{ name: string; undo: () => Promise<void> }>;
}>) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [choosingLayout, setChoosingLayout] = useState(false);
  const [settingsFor, setSettingsFor] = useState<Widget | null>(null);
  const [notice, setNotice] = useState<{ message: string; undo: () => void } | null>(null);
  const [beautifying, setBeautifying] = useState(false);
  const arriving = useRef(false);
  const known = (widgets ?? []).filter((widget) => widgetDefinitions.has(widget.kind));
  const reorderable = useDragReorder(known, onReorder);
  const grid = useRef<HTMLUListElement>(null);
  const boxesBeforeResize = useRef<Map<number, DOMRect> | null>(null);
  const sizesKey = known.map((widget) => `${widget.id}:${widget.size}`).join(",");
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), UNDO_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  async function applyLayout(change: () => Promise<{ name: string; undo: () => Promise<void> }>) {
    setBeautifying(true);
    try {
      const { name, undo } = await change();
      arriving.current = true;
      setNotice({
        message: `Applied the ${name} layout.`,
        undo: () => {
          arriving.current = true;
          void undo();
        }
      });
    } finally {
      setBeautifying(false);
    }
  }

  // After Beautify or its Undo, the new cards settle in one after another.
  const idsKey = known.map((widget) => widget.id).join(",");
  useLayoutEffect(() => {
    if (!arriving.current || !grid.current) return;
    arriving.current = false;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    Array.from(grid.current.children).forEach((card, index) =>
      card.animate(
        [
          { opacity: 0, transform: "translateY(8px) scale(0.98)" },
          { opacity: 1, transform: "none" }
        ],
        {
          duration: 260,
          delay: index * 35,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
          fill: "backwards"
        }
      )
    );
  }, [idsKey]);

  // A resize reflows the whole grid. Each card animates from where it was
  // (measured just before the change) to where it lands: the resized card
  // grows or shrinks, neighbours slide out of its way or into the space it
  // freed. This replaces useDragReorder's own slide for that render.
  function resizeWidget(widget: Widget, size: WidgetSize) {
    if (grid.current) boxesBeforeResize.current = cardBoxes(grid.current);
    onUpdate({ ...widget, size });
  }

  useLayoutEffect(() => {
    const before = boxesBeforeResize.current;
    boxesBeforeResize.current = null;
    if (!before || !grid.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const [id, after] of cardBoxes(grid.current)) {
      const from = before.get(id);
      const card = grid.current.querySelector<HTMLElement>(`[data-widget-id="${id}"]`);
      if (!from || !card) continue;
      const differs = (a: number, b: number) => Math.abs(a - b) > 0.5;
      const moved = differs(from.left, after.left) || differs(from.top, after.top);
      const resized = differs(from.width, after.width) || differs(from.height, after.height);
      if (!moved && !resized) continue;
      for (const animation of card.getAnimations()) animation.cancel();
      const start: Keyframe = {
        transform: `translate(${from.left - after.left}px, ${from.top - after.top}px)`
      };
      const end: Keyframe = { transform: "translate(0, 0)" };
      if (resized) {
        Object.assign(start, { width: `${from.width}px`, height: `${from.height}px` });
        Object.assign(end, { width: `${after.width}px`, height: `${after.height}px` });
      }
      card.animate([start, end], resizeAnimation);
    }
  }, [sizesKey]);

  const settingsDefinition = settingsFor ? widgetDefinitions.get(settingsFor.kind) : undefined;

  function renderBody() {
    if (courses.length === 0) {
      return (
        <section className={clsx("rounded-lg p-5", "border border-ink/10")}>
          <h2 className={clsx("text-base font-semibold")}>Start your first course</h2>
          <BodyText tone="muted" className={clsx("mt-1 max-w-xl")}>
            Make a course for a subject you’re studying, then bring in pages, PDFs and notes as you
            go. Home fills with your progress as you study.
          </BodyText>
          <button
            type="button"
            onClick={onCreateCourse}
            className={clsx(
              "mt-4 h-9 rounded-md",
              "bg-chain-lime text-chain-navy",
              "px-4 text-sm font-semibold",
              "hover:bg-chain-lime/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            )}
          >
            Create a course
          </button>
        </section>
      );
    }
    if (!widgets) return null;
    if (known.length === 0) {
      return (
        <section className={clsx("rounded-lg p-5", "border border-dashed border-ink/20")}>
          <h2 className={clsx("text-base font-semibold")}>Your Home is empty</h2>
          <BodyText tone="muted" className={clsx("mt-1")}>
            Add widgets for what you want to see first: your streak, recent pages, a course’s
            progress, a note to yourself…
          </BodyText>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setAdding(true);
            }}
            className={clsx(primaryButton, "mt-4")}
          >
            Add widget
          </button>
        </section>
      );
    }
    return (
      <ul
        ref={grid}
        aria-label="Widgets"
        className={clsx(
          "grid grid-flow-row-dense auto-rows-40 grid-cols-2 gap-4 @2xl:grid-cols-4 @5xl:grid-cols-6"
        )}
      >
        {reorderable.items.map((widget, index) => {
          const definition = widgetDefinitions.get(widget.kind);
          if (!definition) return null;
          const title = widgetTitle(definition, widget.config, courses);
          return (
            <WidgetFrame
              key={widget.id}
              widgetId={widget.id}
              ref={reorderable.itemRef(widget.id)}
              title={title}
              size={widget.size}
              sizes={definition.sizes}
              editing={editing}
              dragging={reorderable.draggingId === widget.id}
              handle={reorderable.handleProps(widget.id, index)}
              onResize={(size) => resizeWidget(widget, size)}
              onSettings={() => setSettingsFor(widget)}
              onRemove={() => setNotice({ message: `Removed ${title}.`, undo: onRemove(widget) })}
            >
              {definition.render({
                widget,
                courses,
                editing,
                onConfig: (config) => onUpdate({ ...widget, config })
              })}
            </WidgetFrame>
          );
        })}
      </ul>
    );
  }

  return (
    <div className={clsx("@container w-full min-h-0 flex-1 space-y-4 px-4 py-5 sm:px-6")}>
      <header className={clsx("flex flex-wrap items-end justify-between gap-3")}>
        <div>
          <Caption tone="muted">{today}</Caption>
          <h1 className={clsx("text-xl font-semibold tracking-tight")}>{greeting()}</h1>
        </div>
        <div className={clsx("flex gap-2")}>
          {editing ? (
            <>
              <button
                type="button"
                disabled={beautifying}
                onClick={() => void applyLayout(onBeautify)}
                className={secondaryButton}
              >
                Beautify
              </button>
              <button type="button" onClick={() => setChoosingLayout(true)} className={secondaryButton}>
                Layouts
              </button>
              <button type="button" onClick={() => setAdding(true)} className={secondaryButton}>
                Add widget
              </button>
              <button type="button" onClick={() => setEditing(false)} className={primaryButton}>
                Done
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onCreateCourse} className={secondaryButton}>
                New course
              </button>
              {courses.length > 0 && (
                <>
                  <button
                    type="button"
                    disabled={beautifying}
                    onClick={() => void applyLayout(onBeautify)}
                    title="Arrange Home in one of the designed layouts"
                    className={secondaryButton}
                  >
                    Beautify
                  </button>
                  <button type="button" onClick={() => setChoosingLayout(true)} className={secondaryButton}>
                    Layouts
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className={secondaryButton}
                  >
                    Edit Home
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </header>

      {notice && (
        <output
          className={clsx("flex h-9 items-center gap-3 rounded-md px-3", "bg-ink/6", "text-sm")}
        >
          <span className={clsx("min-w-0 flex-1 truncate")}>{notice.message}</span>
          <button
            type="button"
            onClick={() => {
              notice.undo();
              setNotice(null);
            }}
            className={clsx("font-medium underline underline-offset-4", "hover:text-muted")}
          >
            Undo
          </button>
        </output>
      )}

      {renderBody()}

      {adding && (
        <WidgetGallery
          courses={courses}
          onAdd={(widget) => void onAdd(widget)}
          onClose={() => setAdding(false)}
        />
      )}
      {choosingLayout && (
        <LayoutsDialog
          current={(widgets ?? []).map(({ kind, size, config }) => ({ kind, size, config }))}
          onApply={(name, layout) => void applyLayout(() => onApplyLayout(name, layout))}
          onClose={() => setChoosingLayout(false)}
        />
      )}
      {settingsFor && settingsDefinition && (
        <WidgetSettings
          widget={settingsFor}
          definition={settingsDefinition}
          courses={courses}
          onSave={onUpdate}
          onClose={() => setSettingsFor(null)}
        />
      )}
    </div>
  );
}
