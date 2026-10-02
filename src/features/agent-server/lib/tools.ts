import { extractImages, toBase64 } from "../../../shared/lib/htmlImages";
import { getCourse, getCourses } from "../../courses/lib/courses";
import { getModule, getModules } from "../../courses/lib/modules";
import type { Page } from "../../courses/lib/page/types";
import { getPage, getPages, searchPages } from "../../courses/lib/page/table";
import { createPage, updatePage } from "../../courses/lib/page/actions";
import { completionStatusLabels } from "../../courses/lib/completion-status";
import { pageTypeLabels } from "../../courses/components/PageForm";

// A result that's already MCP content, e.g. images the agent should see,
// rather than data to send as JSON text.
export type ToolContent = { content: ({ type: "text"; text: string } | { type: "image"; data: string; mimeType: string })[] };

export function isToolContent(result: unknown): result is ToolContent {
  return typeof result === "object" && result !== null && Array.isArray((result as ToolContent).content);
}

export type Tool = {
  name: string;
  description: string;
  inputSchema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  // Gates this tool behind an approval popup (see approvals.ts) — only the
  // tools that actually change the user's data need one; list/get/search
  // run immediately. `describeCall` renders what the popup shows, from the
  // call's raw (not yet validated) arguments.
  mutates?: boolean;
  describeCall?: (args: Record<string, unknown>) => string;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

function enumOptions(labels: Record<number, string>): string {
  return Object.entries(labels).map(([value, label]) => `${value}=${label}`).join(", ");
}

const STATUS_DESCRIPTION = `Completion status (${enumOptions(completionStatusLabels)}).`;
const PAGE_TYPE_DESCRIPTION = `Page type (${enumOptions(pageTypeLabels)}).`;

function requireNumber(args: Record<string, unknown>, key: string): number {
  const value = args[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`"${key}" must be a number.`);
  return value;
}

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`"${key}" must be a non-empty string.`);
  return value;
}

function optionalNumber(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  return typeof value === "number" ? value : undefined;
}

function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

// list_pages/search_pages return this instead of the full Page — the
// content field can be a whole imported document; every result in a list
// carrying it would flood an agent's context for what's meant to be a
// scan-and-pick-one step. get_page returns the full Page, content
// included, once the caller has actually picked one.
function pageSummary({ content: _content, ...summary }: Page) {
  return summary;
}

export const tools: Tool[] = [
  {
    name: "list_courses",
    description: "List all courses in the workspace.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => getCourses(),
  },
  {
    name: "get_course",
    description: "Get one course by id.",
    inputSchema: { type: "object", properties: { id: { type: "number", description: "Course id." } }, required: ["id"] },
    execute: async (args) => {
      const course = await getCourse(requireNumber(args, "id"));
      if (!course) throw new Error(`No course with id ${args.id}.`);
      return course;
    },
  },
  {
    name: "list_modules",
    description: "List the modules in a course.",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "Course id." },
        status: { type: "number", description: STATUS_DESCRIPTION },
      },
      required: ["course_id"],
    },
    execute: async (args) => getModules(requireNumber(args, "course_id"), { status: optionalNumber(args, "status") }),
  },
  {
    name: "get_module",
    description: "Get one module by id.",
    inputSchema: { type: "object", properties: { id: { type: "number", description: "Module id." } }, required: ["id"] },
    execute: async (args) => {
      const module = await getModule(requireNumber(args, "id"));
      if (!module) throw new Error(`No module with id ${args.id}.`);
      return module;
    },
  },
  {
    name: "list_pages",
    description: "List the pages in a module. Each result omits its content field (call get_page for that) — use this to see what's there before reading one.",
    inputSchema: {
      type: "object",
      properties: {
        module_id: { type: "number", description: "Module id." },
        status: { type: "number", description: STATUS_DESCRIPTION },
        type: { type: "number", description: PAGE_TYPE_DESCRIPTION },
      },
      required: ["module_id"],
    },
    execute: async (args) => {
      const pages = await getPages(requireNumber(args, "module_id"), {
        status: optionalNumber(args, "status"),
        type: optionalNumber(args, "type"),
      });
      return pages.map(pageSummary);
    },
  },
  {
    name: "get_page",
    description: "Get one page by id, including its full HTML content. Its pictures show as <img> tags you can't open; call get_page_images to see them.",
    inputSchema: { type: "object", properties: { id: { type: "number", description: "Page id." } }, required: ["id"] },
    execute: async (args) => {
      const page = await getPage(requireNumber(args, "id"));
      if (!page) throw new Error(`No page with id ${args.id}.`);
      return page;
    },
  },
  {
    name: "get_page_images",
    description: "See the pictures on a page (photos, diagrams, figures) as images, in the order they appear in its content, up to 8. Use this when a page's <img> tags matter to the question.",
    inputSchema: { type: "object", properties: { id: { type: "number", description: "Page id." } }, required: ["id"] },
    execute: async (args): Promise<ToolContent> => {
      const page = await getPage(requireNumber(args, "id"));
      if (!page) throw new Error(`No page with id ${args.id}.`);
      const { images } = await extractImages(page.content ?? "");
      const summary = images.length === 0 ? `"${page.title}" has no pictures.` : `${images.length} picture(s) from "${page.title}", in page order.`;
      return {
        content: [
          { type: "text", text: summary },
          ...images.map((image) => ({ type: "image" as const, data: toBase64(image.bytes), mimeType: image.mediaType }))
        ]
      };
    },
  },
  {
    name: "search_pages",
    description: "Search every page's title and content for a substring, across all courses and modules. Results omit content, like list_pages.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Text to search for." } }, required: ["query"] },
    execute: (args) => searchPages(requireString(args, "query")),
  },
  {
    name: "create_page",
    description: "Create a new page in a module.",
    inputSchema: {
      type: "object",
      properties: {
        module_id: { type: "number", description: "Module id to create the page in." },
        title: { type: "string", description: "Page title." },
        type: { type: "number", description: PAGE_TYPE_DESCRIPTION },
        content: { type: "string", description: "Page body as HTML." },
      },
      required: ["module_id", "title"],
    },
    mutates: true,
    describeCall: (args) => `Create a page titled "${typeof args.title === "string" && args.title.trim() ? args.title : "Untitled"}"${typeof args.module_id === "number" ? ` in module #${args.module_id}` : ""}.`,
    execute: async (args) => createPage(requireNumber(args, "module_id"), {
      title: requireString(args, "title"),
      type: optionalNumber(args, "type"),
      content: optionalString(args, "content"),
    }),
  },
  {
    name: "update_page",
    description: "Update an existing page's title, type, content, or completion status. Only the fields provided are changed.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Page id." },
        title: { type: "string" },
        type: { type: "number", description: PAGE_TYPE_DESCRIPTION },
        content: {
          type: "string",
          description: "Page body as HTML. Replaces the entire current content, so first re-read it with get_page and reproduce any part you aren't intentionally changing byte-for-byte — including <mark data-highlight-ref=\"...\"> tags around text the user highlighted, which must stay wrapped around that exact text.",
        },
        status: { type: "number", description: STATUS_DESCRIPTION },
      },
      required: ["id"],
    },
    mutates: true,
    describeCall: (args) => {
      const fields = (["title", "type", "content", "status"] as const).filter((key) => args[key] !== undefined);
      return `Update page #${typeof args.id === "number" ? args.id : "?"}${fields.length ? ` (${fields.join(", ")})` : ""}.`;
    },
    execute: async (args) => updatePage(requireNumber(args, "id"), {
      title: optionalString(args, "title"),
      type: optionalNumber(args, "type"),
      content: optionalString(args, "content"),
      status: optionalNumber(args, "status"),
    }),
  },
];
