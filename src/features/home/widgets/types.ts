import type { ReactNode } from "react";

import type { SelectOption } from "../../../shared/ui/Select";
import type { Course } from "../../courses/lib/courses";
import type { Widget, WidgetConfig, WidgetSize } from "../lib/widgets";

export type WidgetCategory = "Study" | "Progress" | "Courses" | "AI" | "Your own";

export const widgetCategories: WidgetCategory[] = ["Study", "Progress", "Courses", "AI", "Your own"];

// A setting in a widget's settings dialog, stored under `key` in its config.
export type WidgetField =
  | { key: string; label: string; type: "course"; required?: boolean }
  | { key: string; label: string; type: "select"; options: SelectOption<string | number>[] }
  | { key: string; label: string; type: "text"; placeholder?: string }
  | { key: string; label: string; type: "actions" }
  | { key: string; label: string; type: "links" };

export type WidgetProps = {
  widget: Widget;
  courses: Course[];
  editing: boolean;
  onConfig: (config: WidgetConfig) => void;
};

export type WidgetDefinition = {
  kind: string;
  name: string;
  description: string;
  category: WidgetCategory;
  sizes: WidgetSize[];
  defaultSize: WidgetSize;
  defaultConfig?: WidgetConfig;
  fields?: WidgetField[];
  // The title shown when the user hasn't renamed it; may depend on config.
  title?: (config: WidgetConfig, courses: Course[]) => string;
  render: (props: WidgetProps) => ReactNode;
};
