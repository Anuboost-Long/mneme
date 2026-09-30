import clsx from "clsx";
import { useState } from "react";

import Dialog from "../../../shared/ui/Dialog";
import { TextInput } from "../../../shared/ui/Input";
import Select from "../../../shared/ui/Select";
import { Caption, Typography } from "../../../shared/ui/Typography";
import CourseIcon from "../../../shared/ui/CourseIcon";
import { getActions } from "../../ai-actions/lib/actions";
import type { Course } from "../../courses/lib/courses";
import { searchPageLinks } from "../../courses/lib/pages";
import { getPagesByIds } from "../lib/dashboard";
import { useWidgetData } from "../lib/useWidgetData";
import type { Widget, WidgetConfig } from "../lib/widgets";
import { widgetTitle } from "../widgets/catalog";
import { quickLinks, type QuickLink } from "../widgets/tools";
import type { WidgetDefinition, WidgetField } from "../widgets/types";

export default function WidgetSettings({ widget, definition, courses, onSave, onClose }: Readonly<{
  widget: Widget;
  definition: WidgetDefinition;
  courses: Course[];
  onSave: (widget: Widget) => void;
  onClose: () => void;
}>) {
  const [config, setConfig] = useState<WidgetConfig>(widget.config);
  const set = (key: string, value: unknown) => setConfig((current) => ({ ...current, [key]: value }));

  return (
    <Dialog title={`${definition.name} settings`} onClose={onClose}>
      {(close, complete) => (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave({ ...widget, config });
            complete(onClose);
          }}
          className={clsx("space-y-5")}
        >
          <TextInput
            label="Title"
            value={typeof config.title === "string" ? config.title : ""}
            placeholder={widgetTitle(definition, { ...config, title: "" }, courses)}
            onChange={(event) => set("title", event.target.value)}
          />
          {definition.fields?.map((field) => (
            <FieldControl key={field.key} field={field} value={config[field.key]} courses={courses} onChange={(value) => set(field.key, value)} />
          ))}
          <div className={clsx("flex justify-end gap-3 pt-3")}>
            <button type="button" onClick={close} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm", "hover:bg-ink/5")}>Cancel</button>
            <button type="submit" className={clsx("rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action", "hover:bg-action/85")}>Save widget</button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function FieldControl({ field, value, courses, onChange }: Readonly<{ field: WidgetField; value: unknown; courses: Course[]; onChange: (value: unknown) => void }>) {
  switch (field.type) {
    case "course": {
      const options = courses.map((course) => ({ value: course.id, label: course.name }));
      const fallback = field.required ? (courses[0]?.id ?? 0) : 0;
      return <Select label={field.label} value={Number(value) || fallback} onChange={onChange} options={field.required ? options : [{ value: 0, label: "All courses" }, ...options]} />;
    }
    case "select":
      return <Select label={field.label} value={(value as string | number | undefined) ?? field.options[0].value} onChange={onChange} options={field.options} />;
    case "text":
      return <TextInput label={field.label} value={typeof value === "string" ? value : ""} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} />;
    case "actions":
      return <ActionsField label={field.label} value={Array.isArray(value) ? (value as number[]) : []} onChange={onChange} />;
    case "links":
      return <LinksField label={field.label} value={quickLinks({ links: value })} courses={courses} onChange={onChange} />;
  }
}

// None ticked means every action, so new actions show up without a visit here.
function ActionsField({ label, value, onChange }: Readonly<{ label: string; value: number[]; onChange: (value: number[]) => void }>) {
  const actions = useWidgetData(getActions, "actions");
  return (
    <fieldset className={clsx("min-w-0 space-y-2")}>
      <legend><Typography as="span" variant="label">{label}</Typography></legend>
      <Caption tone="muted">Leave all unticked to show every action.</Caption>
      <ul className={clsx("max-h-56 divide-y divide-ink/10 overflow-y-auto rounded-md", "border border-ink/15")}>
        {actions?.map((action) => (
          <li key={action.id}>
            <label className={clsx("flex h-9 cursor-pointer items-center gap-3 px-3 text-sm", "hover:bg-ink/4")}>
              <input
                type="checkbox"
                checked={value.includes(action.id)}
                onChange={(event) => onChange(event.target.checked ? [...value, action.id] : value.filter((id) => id !== action.id))}
                className={clsx("accent-ink")}
              />
              {action.name}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

function LinksField({ label, value, courses, onChange }: Readonly<{ label: string; value: QuickLink[]; courses: Course[]; onChange: (value: QuickLink[]) => void }>) {
  const [query, setQuery] = useState("");
  const pageIds = value.filter((link) => link.kind === "page").map((link) => link.id);
  const pages = useWidgetData(() => getPagesByIds(pageIds), pageIds.join(","));
  const results = useWidgetData(() => (query.trim() ? searchPageLinks(query, 6) : Promise.resolve([])), query);
  const has = (link: QuickLink) => value.some((item) => item.kind === link.kind && item.id === link.id);
  const add = (link: QuickLink) => !has(link) && onChange([...value, link]);
  const matchingCourses = query.trim() ? courses.filter((course) => course.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 3) : [];

  const labelFor = (link: QuickLink) =>
    link.kind === "course" ? courses.find((course) => course.id === link.id)?.name : pages?.find((page) => page.id === link.id)?.title;

  return (
    <fieldset className={clsx("min-w-0 space-y-2")}>
      <legend><Typography as="span" variant="label">{label}</Typography></legend>
      {value.length > 0 && (
        <ul className={clsx("divide-y divide-ink/10 rounded-md", "border border-ink/15")}>
          {value.map((link) => (
            <li key={`${link.kind}-${link.id}`} className={clsx("flex h-9 items-center gap-3 px-3 text-sm")}>
              <span className={clsx("min-w-0 flex-1 truncate")}>{labelFor(link) ?? "Not found"}</span>
              <Caption as="span" tone="muted">{link.kind === "course" ? "Course" : "Page"}</Caption>
              <button type="button" onClick={() => onChange(value.filter((item) => item !== link))} aria-label={`Remove ${labelFor(link) ?? "link"}`} className={clsx("text-muted", "hover:text-danger")}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        type="search"
        value={query}
        placeholder="Search pages and courses to add…"
        aria-label="Add a page or course"
        onChange={(event) => setQuery(event.target.value)}
        className={clsx("h-9 w-full rounded-md", "border border-ink/20 bg-surface", "px-3 text-sm placeholder:text-muted", "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink")}
      />
      {(matchingCourses.length > 0 || (results?.length ?? 0) > 0) && (
        <ul className={clsx("divide-y divide-ink/10 rounded-md", "border border-ink/15")}>
          {matchingCourses.map((course) => (
            <li key={`course-${course.id}`}>
              <button type="button" onClick={() => add({ kind: "course", id: course.id })} className={clsx("flex h-9 w-full items-center gap-3 px-3 text-left text-sm", "hover:bg-ink/4")}>
                <CourseIcon icon={course.icon} color={course.color} small />
                <span className={clsx("min-w-0 flex-1 truncate")}>{course.name}</span>
                <Caption as="span" tone="muted">Course</Caption>
              </button>
            </li>
          ))}
          {results?.map((page) => (
            <li key={`page-${page.id}`}>
              <button type="button" onClick={() => add({ kind: "page", id: page.id })} className={clsx("flex h-9 w-full items-center gap-3 px-3 text-left text-sm", "hover:bg-ink/4")}>
                <span className={clsx("min-w-0 flex-1 truncate")}>{page.title}</span>
                <Caption as="span" tone="muted" className={clsx("max-w-40 truncate")}>{page.module_name}</Caption>
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
