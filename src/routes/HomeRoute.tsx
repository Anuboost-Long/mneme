import { useEffect, useRef, useState } from "react";

import { useCourses } from "../features/courses/lib/coursesState";
import {
  addWidget,
  getWidgets,
  removeWidget,
  reorderWidgets,
  replaceWidgets,
  restoreWidget,
  updateWidget
} from "../features/home/lib/widget/actions";
import type { NewWidget, Widget } from "../features/home/lib/widget/types";
import HomePage from "../features/home/pages/HomePage";
import { defaultWidgets, layoutPresets } from "../features/home/widgets/catalog";

export default function HomeRoute() {
  const { courses, create } = useCourses();
  const [widgets, setWidgets] = useState<Widget[] | null>(null);
  const lastPreset = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    getWidgets(defaultWidgets)
      .then((loaded) => active && setWidgets(loaded))
      .catch(() => active && setWidgets([]));
    return () => {
      active = false;
    };
  }, []);

  async function add(widget: NewWidget) {
    const added = await addWidget(widget);
    setWidgets((current) => [...(current ?? []), added]);
  }

  function update(widget: Widget) {
    setWidgets(
      (current) => current?.map((item) => (item.id === widget.id ? widget : item)) ?? null
    );
    void updateWidget(widget);
  }

  // Returns Undo, which puts the widget back where it was.
  function remove(widget: Widget) {
    const order = (widgets ?? []).map((item) => item.id);
    setWidgets((current) => current?.filter((item) => item.id !== widget.id) ?? null);
    void removeWidget(widget.id);
    return () => {
      const byId = new Map([...(widgets ?? []), widget].map((item) => [item.id, item]));
      setWidgets(order.flatMap((id) => byId.get(id) ?? []));
      void restoreWidget(widget, order);
    };
  }

  async function applyLayout(name: string, layout: NewWidget[]) {
    const previous = (widgets ?? []).map(({ kind, size, config }) => ({ kind, size, config }));
    setWidgets(await replaceWidgets(layout));
    return {
      name,
      undo: async () => {
        setWidgets(await replaceWidgets(previous));
      }
    };
  }

  function beautify() {
    const choices = layoutPresets.filter((preset) => preset.name !== lastPreset.current);
    const preset = choices[Math.floor(Math.random() * choices.length)];
    lastPreset.current = preset.name;
    return applyLayout(preset.name, preset.widgets);
  }

  function reorder(next: Widget[]) {
    setWidgets(next);
    void reorderWidgets(next.map((widget) => widget.id));
  }

  return (
    <HomePage
      courses={courses}
      widgets={widgets}
      onCreateCourse={create}
      onAdd={add}
      onUpdate={update}
      onRemove={remove}
      onReorder={reorder}
      onBeautify={beautify}
      onApplyLayout={applyLayout}
    />
  );
}
