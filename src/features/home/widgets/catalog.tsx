import { pageTypeOptions } from "../../courses/lib/page-type/pageTypesState";
import { CompletionStatus, completionStatusLabels } from "../../courses/lib/completion-status";
import type { Course } from "../../courses/lib/course/types";
import { pageSorts } from "../lib/dashboard/types";
import type { NewWidget, WidgetConfig } from "../lib/widget/types";
import { BookshelfWidget } from "./Bookshelf";
import {
  AiUsageWidget,
  PageTypesWidget,
  PinnedCoursesWidget,
  QuickActionsWidget,
  RecentCoursesWidget
} from "./courses";
import {
  ActivityWidget,
  CourseProgressWidget,
  FinishedWidget,
  ModulesWidget,
  PageCountWidget,
  StatusWidget,
  StreakWidget
} from "./progress";
import { RecorderWidget } from "./Recorder";
import { ContinueWidget, HighlightsWidget, PageListWidget } from "./study";
import { TasksWidget } from "./tasks";
import { LinksWidget, NoteWidget } from "./tools";
import type { WidgetDefinition, WidgetField } from "./types";

const course: WidgetField = { key: "courseId", label: "Course", type: "course" };

const type: WidgetField = {
  key: "type",
  label: "Page type",
  type: "select",
  get options() {
    return [{ value: 0, label: "Any type" }, ...pageTypeOptions()];
  }
};

const status: WidgetField = {
  key: "status",
  label: "Status",
  type: "select",
  options: [
    { value: 0, label: "Any status" },
    ...Object.values(CompletionStatus)
      .filter((value) => typeof value === "number")
      .map((value) => ({ value, label: completionStatusLabels[value] }))
  ]
};

const sort: WidgetField = {
  key: "sort",
  label: "Order",
  type: "select",
  options: Object.entries(pageSorts).map(([value, label]) => ({ value, label }))
};

// "Recent pages" becomes "Recent pages · Biology" once a course is chosen.
const inCourse = (base: string) => (config: WidgetConfig, courses: Course[]) => {
  const chosen = courses.find((item) => item.id === Number(config.courseId));
  return chosen ? `${base} · ${chosen.name}` : base;
};

export const widgetCatalog: WidgetDefinition[] = [
  {
    kind: "continue",
    name: "Continue",
    description: "The page you opened last, one click away.",
    category: "Study",
    sizes: ["small", "medium"],
    defaultSize: "medium",
    render: (props) => <ContinueWidget {...props} />
  },
  {
    kind: "recent-pages",
    name: "Recent pages",
    description: "Pages you opened lately.",
    category: "Study",
    sizes: ["medium", "wide", "large"],
    defaultSize: "wide",
    fields: [course],
    title: inCourse("Recent pages"),
    render: (props) => <PageListWidget {...props} />
  },
  {
    kind: "revision",
    name: "Needs revision",
    description: "Pages you marked Revision needed.",
    category: "Study",
    sizes: ["small", "medium", "wide", "large"],
    defaultSize: "medium",
    defaultConfig: { status: CompletionStatus.RevisionNeeded },
    fields: [course],
    title: inCourse("Needs revision"),
    render: (props) => <PageListWidget {...props} />
  },
  {
    kind: "recordings",
    name: "Recorder",
    description:
      "Record from Home, then save it to a page, transcribed if you like. Large also lists your latest recordings.",
    category: "Study",
    sizes: ["small", "medium", "wide", "large"],
    defaultSize: "medium",
    render: (props) => <RecorderWidget {...props} />
  },
  {
    kind: "tasks",
    name: "Tasks",
    description: "Your next tasks, overdue first. Tick one off right here.",
    category: "Study",
    sizes: ["small", "medium", "wide", "large"],
    defaultSize: "medium",
    fields: [course],
    title: inCourse("Tasks"),
    render: (props) => <TasksWidget {...props} />
  },
  {
    kind: "highlights",
    name: "Highlights",
    description: "Text you highlighted most recently.",
    category: "Study",
    sizes: ["medium", "wide", "large"],
    defaultSize: "medium",
    render: (props) => <HighlightsWidget {...props} />
  },

  {
    kind: "streak",
    name: "Study streak",
    description: "Days in a row you opened a page.",
    category: "Progress",
    sizes: ["small", "medium"],
    defaultSize: "small",
    render: (props) => <StreakWidget {...props} />
  },
  {
    kind: "activity",
    name: "Activity",
    description: "Pages opened or finished per day.",
    category: "Progress",
    sizes: ["medium", "wide", "large"],
    defaultSize: "medium",
    defaultConfig: { days: 14, metric: "opened" },
    fields: [
      {
        key: "metric",
        label: "Show",
        type: "select",
        options: [
          { value: "opened", label: "Pages opened" },
          { value: "completed", label: "Pages finished" }
        ]
      },
      {
        key: "days",
        label: "Period",
        type: "select",
        options: [
          { value: 7, label: "Last 7 days" },
          { value: 14, label: "Last 14 days" },
          { value: 30, label: "Last 30 days" }
        ]
      }
    ],
    render: (props) => <ActivityWidget {...props} />
  },
  {
    kind: "finished",
    name: "Pages finished",
    description: "How many pages you completed lately.",
    category: "Progress",
    sizes: ["small"],
    defaultSize: "small",
    defaultConfig: { period: "week" },
    fields: [
      {
        key: "period",
        label: "Period",
        type: "select",
        options: [
          { value: "week", label: "This week" },
          { value: "month", label: "This month" },
          { value: "year", label: "This year" }
        ]
      }
    ],
    render: (props) => <FinishedWidget {...props} />
  },
  {
    kind: "status",
    name: "Page status",
    description: "How your pages split across Not started, In progress and Completed.",
    category: "Progress",
    sizes: ["small", "medium"],
    defaultSize: "small",
    fields: [course],
    title: inCourse("Page status"),
    render: (props) => <StatusWidget {...props} />
  },
  {
    kind: "modules",
    name: "Modules in progress",
    description: "Modules with pages left, or every module of one course.",
    category: "Progress",
    sizes: ["medium", "wide", "large"],
    defaultSize: "medium",
    fields: [course],
    title: inCourse("Modules in progress"),
    render: (props) => <ModulesWidget {...props} />
  },
  {
    kind: "course-progress",
    name: "Course progress",
    description: "One course’s progress, module by module in Large.",
    category: "Progress",
    sizes: ["small", "medium", "large"],
    defaultSize: "small",
    fields: [{ ...course, required: true }],
    title: () => "Course progress",
    render: (props) => <CourseProgressWidget {...props} />
  },

  {
    kind: "pinned-courses",
    name: "Pinned courses",
    description: "Courses you pinned.",
    category: "Courses",
    sizes: ["small", "medium", "large"],
    defaultSize: "medium",
    render: (props) => <PinnedCoursesWidget {...props} />
  },
  {
    kind: "recent-courses",
    name: "Recent courses",
    description: "Courses you studied lately, with progress.",
    category: "Courses",
    sizes: ["small", "medium", "large"],
    defaultSize: "medium",
    render: (props) => <RecentCoursesWidget {...props} />
  },
  {
    kind: "library",
    name: "Library",
    description:
      "Your courses as books on a shelf: bigger books have more pages, and each fills up as you finish it.",
    category: "Courses",
    sizes: ["small", "medium", "wide", "large"],
    defaultSize: "medium",
    render: (props) => <BookshelfWidget {...props} />
  },
  {
    kind: "page-types",
    name: "Page types",
    description: "Your mix of lessons, lectures, exercises and more.",
    category: "Courses",
    sizes: ["medium", "large"],
    defaultSize: "medium",
    fields: [course],
    title: inCourse("Page types"),
    render: (props) => <PageTypesWidget {...props} />
  },

  {
    kind: "quick-actions",
    name: "Quick AI actions",
    description: "Run an AI action on the page you opened last.",
    category: "AI",
    sizes: ["small", "medium", "large"],
    defaultSize: "medium",
    fields: [{ key: "actionIds", label: "Actions", type: "actions" }],
    render: (props) => <QuickActionsWidget {...props} />
  },
  {
    kind: "ai-usage",
    name: "Agent usage",
    description: "How often you ran agents, with tokens and cost when known.",
    category: "AI",
    sizes: ["small", "medium"],
    defaultSize: "small",
    defaultConfig: { days: 7 },
    fields: [
      {
        key: "days",
        label: "Period",
        type: "select",
        options: [
          { value: 7, label: "Last 7 days" },
          { value: 30, label: "Last 30 days" },
          { value: 365, label: "Last year" }
        ]
      }
    ],
    render: (props) => <AiUsageWidget {...props} />
  },

  {
    kind: "page-list",
    name: "Page list",
    description: "Your own list: pick the course, type, status and order.",
    category: "Your own",
    sizes: ["small", "medium", "wide", "large"],
    defaultSize: "medium",
    defaultConfig: { title: "My pages", sort: "opened" },
    fields: [course, type, status, sort],
    render: (props) => <PageListWidget {...props} />
  },
  {
    kind: "page-count",
    name: "Page count",
    description: "Count the pages that match your filters, like unfinished assignments.",
    category: "Your own",
    sizes: ["small", "medium"],
    defaultSize: "small",
    defaultConfig: { title: "Page count" },
    fields: [
      course,
      type,
      status,
      { key: "label", label: "Counted as", type: "text", placeholder: "pages" }
    ],
    render: (props) => <PageCountWidget {...props} />
  },
  {
    kind: "note",
    name: "Note",
    description: "A sticky note for reminders and goals.",
    category: "Your own",
    sizes: ["small", "medium", "wide", "large"],
    defaultSize: "small",
    defaultConfig: { title: "Note", text: "" },
    render: (props) => <NoteWidget {...props} />
  },
  {
    kind: "links",
    name: "Quick links",
    description: "Shortcuts to the pages and courses you choose.",
    category: "Your own",
    sizes: ["small", "medium", "large"],
    defaultSize: "medium",
    defaultConfig: { title: "Quick links", links: [] },
    fields: [{ key: "links", label: "Links", type: "links" }],
    render: (props) => <LinksWidget {...props} />
  }
];

export const widgetDefinitions = new Map(
  widgetCatalog.map((definition) => [definition.kind, definition])
);

export function widgetTitle(definition: WidgetDefinition, config: WidgetConfig, courses: Course[]) {
  const custom = typeof config.title === "string" ? config.title.trim() : "";
  return custom || definition.title?.(config, courses) || definition.name;
}

export function newWidget(definition: WidgetDefinition, size = definition.defaultSize): NewWidget {
  return { kind: definition.kind, size, config: { ...definition.defaultConfig } };
}

// Home's first layout, before the user changes anything.
export const defaultWidgets: NewWidget[] = (
  [
    ["continue", "medium"],
    ["streak", "small"],
    ["finished", "small"],
    ["quick-actions", "medium"],
    ["recent-pages", "wide"],
    ["activity", "medium"],
    ["modules", "medium"],
    ["recent-courses", "medium"],
    ["status", "small"],
    ["library", "small"]
  ] as const
).flatMap(([kind, size]) => {
  const definition = widgetDefinitions.get(kind);
  return definition ? [newWidget(definition, size)] : [];
});

export type LayoutPreset = { name: string; widgets: NewWidget[] };

type PresetEntry = readonly [kind: string, size: NewWidget["size"], config?: WidgetConfig];

function preset(name: string, entries: PresetEntry[]): LayoutPreset {
  const widgets = entries.flatMap(([kind, size, config]) => {
    const definition = widgetDefinitions.get(kind);
    return definition
      ? [{ ...newWidget(definition, size), config: { ...definition.defaultConfig, ...config } }]
      : [];
  });
  return { name, widgets };
}

// Beautify's layouts. Each fills the 6-column grid exactly, row by row in
// this order (a Large takes its 2x2 first; the rest flow around it), so
// there are no gaps; on 4 and 2 columns dense flow keeps them tidy.
export const layoutPresets: LayoutPreset[] = [
  preset("Focus", [
    ["recent-pages", "large"],
    ["continue", "medium"],
    ["streak", "small"],
    ["finished", "small"],
    ["activity", "medium"],
    ["quick-actions", "medium"],
    ["modules", "wide"],
    ["status", "small"],
    ["library", "small"]
  ]),
  preset("Progress", [
    ["course-progress", "large"],
    ["activity", "wide", { days: 30 }],
    ["status", "small"],
    ["finished", "small"],
    ["streak", "small"],
    ["library", "small"],
    ["modules", "medium"],
    ["recent-courses", "medium"],
    ["page-types", "medium"]
  ]),
  preset("Minimal", [
    ["continue", "medium"],
    ["streak", "small"],
    ["finished", "small"],
    ["quick-actions", "medium"],
    ["recent-pages", "wide"],
    ["recent-courses", "medium"]
  ]),
  preset("Review", [
    ["revision", "large"],
    ["highlights", "medium"],
    ["streak", "small"],
    ["status", "small"],
    ["recordings", "medium"],
    ["quick-actions", "medium"],
    ["recent-pages", "wide"],
    ["continue", "medium"]
  ]),
  preset("Planner", [
    ["note", "large", { title: "This week", text: "Goals for this week:\n\n- \n- \n- " }],
    ["continue", "medium"],
    ["streak", "small"],
    ["finished", "small"],
    [
      "page-count",
      "small",
      { title: "In progress", status: CompletionStatus.InProgress, label: "pages in progress" }
    ],
    [
      "page-count",
      "small",
      { title: "Not started", status: CompletionStatus.NotStarted, label: "pages to start" }
    ],
    ["activity", "medium"],
    ["recent-pages", "wide"],
    ["modules", "medium"]
  ])
];
