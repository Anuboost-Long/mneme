import { useEffect, useRef, useState } from "react";
import HomePage from "../features/home/pages/HomePage";
import { addWidget, getWidgets, removeWidget, reorderWidgets, replaceWidgets, restoreWidget, updateWidget, type NewWidget, type Widget } from "../features/home/lib/widgets";
import { defaultWidgets, layoutPresets } from "../features/home/widgets/catalog";
import { useCourses } from "../layouts/RootLayout";

export default function HomeRoute() {
  const { courses, create } = useCourses();
  const [widgets, setWidgets] = useState<Widget[] | null>(null);
  const lastPreset = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    getWidgets(defaultWidgets)
      .then((loaded) => active && setWidgets(loaded))
      .catch(() => active && setWidgets([]));
    return () => { active = false; };
  }, []);

  async function add(widget: NewWidget) {
    const added = await addWidget(widget);
    setWidgets((current) => [...(current ?? []), added]);
  }

  function update(widget: Widget) {
    setWidgets((current) => current?.map((item) => (item.id === widget.id ? widget : item)) ?? null);
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

  // A random preset, never the one just applied. Returns its name and an
  // Undo that brings back the exact previous layout, notes and settings too.
  async function beautify() {
    const choices = layoutPresets.filter((preset) => preset.name !== lastPreset.current);
    const preset = choices[Math.floor(Math.random() * choices.length)];
    lastPreset.current = preset.name;
    const previous = (widgets ?? []).map(({ kind, size, config }) => ({ kind, size, config }));
    setWidgets(await replaceWidgets(preset.widgets));
    return {
      name: preset.name,
      undo: async () => {
        setWidgets(await replaceWidgets(previous));
      }
    };
  }

  function reorder(next: Widget[]) {
    setWidgets(next);
    void reorderWidgets(next.map((widget) => widget.id));
  }

  return <HomePage courses={courses} widgets={widgets} onCreateCourse={create} onAdd={add} onUpdate={update} onRemove={remove} onReorder={reorder} onBeautify={beautify} />;
}
