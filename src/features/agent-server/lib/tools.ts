import { extractImages, toBase64 } from "../../../shared/lib/htmlImages";
import { pageTypeLabels } from "../../courses/components/PageForm";
import { completionStatusLabels } from "../../courses/lib/completion-status";
import { getCourse, getCourses } from "../../courses/lib/course/actions";
import { getModule, getModules } from "../../courses/lib/module/actions";
import {
  getPage,
  getPages,
  searchPages,
  createPage,
  createPageAfter,
  insertBlocks,
  movePage,
  updatePage
} from "../../courses/lib/page/actions";
import { PageType, type Page } from "../../courses/lib/page/types";
import { getPageRecordings, getRecording } from "../../courses/lib/recording/actions";
import type { Recording } from "../../courses/lib/recording/types";

// A result that's already MCP content, e.g. images the agent should see,
// rather than data to send as JSON text.
export type ToolContent = {
  content: ({ type: "text"; text: string } | { type: "image"; data: string; mimeType: string })[];
};

export function isToolContent(result: unknown): result is ToolContent {
  return (
    typeof result === "object" && result !== null && Array.isArray((result as ToolContent).content)
  );
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
  destructive?: (args: Record<string, unknown>) => boolean;
  describeCall?: (args: Record<string, unknown>) => string;
  check?: (args: Record<string, unknown>) => Promise<unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

function enumOptions(labels: Record<number, string>): string {
  return Object.entries(labels)
    .map(([value, label]) => `${value}=${label}`)
    .join(", ");
}

const STATUS_DESCRIPTION = `Completion status (${enumOptions(completionStatusLabels)}).`;
const PAGE_TYPE_DESCRIPTION = `Page type (${enumOptions(pageTypeLabels)}).`;

function requireNumber(args: Record<string, unknown>, key: string): number {
  const value = args[key];
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`"${key}" must be a number.`);
  return value;
}

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || !value.trim())
    throw new Error(`"${key}" must be a non-empty string.`);
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

async function requirePage(id: number) {
  const page = await getPage(id);
  if (!page) throw new Error(`No page with id ${id}. Call list_pages or search_pages to find one.`);
  return page;
}

async function requireModule(id: number) {
  const module = await getModule(id);
  if (!module) throw new Error(`No module with id ${id}. Call list_modules to find one.`);
  return module;
}

function transcriptOf({ id, page_id, name, duration_ms, transcript }: Recording) {
  return { id, page_id, name, duration_ms, transcript };
}

function pageRef(args: Record<string, unknown>, key: string) {
  return typeof args[key] === "number" ? `#${args[key]}` : "?";
}

export const tools: Tool[] = [
  {
    name: "list_courses",
    description: "List all courses in the workspace.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => getCourses()
  },
  {
    name: "get_course",
    description: "Get one course by id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number", description: "Course id." } },
      required: ["id"]
    },
    execute: async (args) => {
      const course = await getCourse(requireNumber(args, "id"));
      if (!course) throw new Error(`No course with id ${args.id}.`);
      return course;
    }
  },
  {
    name: "list_modules",
    description: "List the modules in a course.",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "Course id." },
        status: { type: "number", description: STATUS_DESCRIPTION }
      },
      required: ["course_id"]
    },
    execute: async (args) =>
      getModules(requireNumber(args, "course_id"), { status: optionalNumber(args, "status") })
  },
  {
    name: "get_module",
    description: "Get one module by id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number", description: "Module id." } },
      required: ["id"]
    },
    execute: async (args) => {
      const module = await getModule(requireNumber(args, "id"));
      if (!module) throw new Error(`No module with id ${args.id}.`);
      return module;
    }
  },
  {
    name: "list_pages",
    description:
      "List the pages in a module. Each result omits its content field (call get_page for that) — use this to see what's there before reading one.",
    inputSchema: {
      type: "object",
      properties: {
        module_id: { type: "number", description: "Module id." },
        status: { type: "number", description: STATUS_DESCRIPTION },
        type: { type: "number", description: PAGE_TYPE_DESCRIPTION }
      },
      required: ["module_id"]
    },
    execute: async (args) => {
      const pages = await getPages(requireNumber(args, "module_id"), {
        status: optionalNumber(args, "status"),
        type: optionalNumber(args, "type")
      });
      return pages.map(pageSummary);
    }
  },
  {
    name: "get_page",
    description:
      "Get one page by id, including its full HTML content. Its pictures show as <img> tags you can't open; call get_page_images to see them.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number", description: "Page id." } },
      required: ["id"]
    },
    execute: async (args) => {
      const page = await getPage(requireNumber(args, "id"));
      if (!page) throw new Error(`No page with id ${args.id}.`);
      return page;
    }
  },
  {
    name: "get_page_images",
    description:
      "See the pictures on a page (photos, diagrams, figures) as images, in the order they appear in its content, up to 8. Use this when a page's <img> tags matter to the question.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number", description: "Page id." } },
      required: ["id"]
    },
    execute: async (args): Promise<ToolContent> => {
      const page = await getPage(requireNumber(args, "id"));
      if (!page) throw new Error(`No page with id ${args.id}.`);
      const { images } = await extractImages(page.content ?? "");
      const summary =
        images.length === 0
          ? `"${page.title}" has no pictures.`
          : `${images.length} picture(s) from "${page.title}", in page order.`;
      return {
        content: [
          { type: "text", text: summary },
          ...images.map((image) => ({
            type: "image" as const,
            data: toBase64(image.bytes),
            mimeType: image.mediaType
          }))
        ]
      };
    }
  },
  {
    name: "search_pages",
    description:
      "Search every page's title and content for a substring, across all courses and modules. Results omit content, like list_pages.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Text to search for." } },
      required: ["query"]
    },
    execute: (args) => searchPages(requireString(args, "query"))
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
        content: { type: "string", description: "Page body as HTML." }
      },
      required: ["module_id", "title"]
    },
    mutates: true,
    describeCall: (args) =>
      `Create a page titled "${typeof args.title === "string" && args.title.trim() ? args.title : "Untitled"}"${typeof args.module_id === "number" ? ` in module #${args.module_id}` : ""}.`,
    check: (args) => requireModule(requireNumber(args, "module_id")),
    execute: async (args) => {
      const module = await requireModule(requireNumber(args, "module_id"));
      return createPage(module.id, {
        title: requireString(args, "title"),
        type: optionalNumber(args, "type"),
        content: optionalString(args, "content")
      });
    }
  },
  {
    name: "insert_blocks",
    description:
      "Add HTML blocks to a page without rewriting the rest of it: at the end (default), at the start, or right after the first top-level block whose text contains after_text. Everything already on the page, highlights included, stays exactly as it was, so prefer this to update_page when you're adding rather than changing content.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Page id." },
        html: { type: "string", description: "The blocks to add, as HTML (paragraphs, headings, lists, tables...)." },
        position: { type: "string", enum: ["start", "end"], description: "Where to add them when after_text isn't given. Defaults to end." },
        after_text: { type: "string", description: "Add them right after the first block containing this text (case-insensitive)." }
      },
      required: ["id", "html"]
    },
    mutates: true,
    describeCall: (args) => {
      const after = optionalString(args, "after_text");
      let where = " at the end";
      if (after) where = ` after “${after}”`;
      else if (args.position === "start") where = " at the start";
      return `Add content to page ${pageRef(args, "id")}${where}.`;
    },
    check: (args) => requirePage(requireNumber(args, "id")),
    execute: async (args) =>
      pageSummary(
        await insertBlocks((await requirePage(requireNumber(args, "id"))).id, requireString(args, "html"), {
          after: optionalString(args, "after_text"),
          at: args.position === "start" ? "start" : "end"
        })
      )
  },
  {
    name: "move_page",
    description:
      "Move a page to the end of another module, in this or any other course. Its recordings, attachments and highlights move with it.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Page id." },
        module_id: { type: "number", description: "Module id to move the page into." }
      },
      required: ["id", "module_id"]
    },
    mutates: true,
    describeCall: (args) => `Move page ${pageRef(args, "id")} to module ${pageRef(args, "module_id")}.`,
    check: async (args) => {
      await requirePage(requireNumber(args, "id"));
      await requireModule(requireNumber(args, "module_id"));
    },
    execute: async (args) => {
      const page = await requirePage(requireNumber(args, "id"));
      const module = await requireModule(requireNumber(args, "module_id"));
      return pageSummary(await movePage(page.id, module.id));
    }
  },
  {
    name: "read_transcript",
    description:
      "Read the transcripts of the audio recordings on a page (page_id), or of one recording (recording_id). A recording that hasn't been transcribed yet has transcript null; the user can transcribe it from its recording block.",
    inputSchema: {
      type: "object",
      properties: {
        page_id: { type: "number", description: "Page id: every recording on that page, oldest first." },
        recording_id: { type: "number", description: "Recording id: just that recording." }
      }
    },
    execute: async (args) => {
      const recordingId = optionalNumber(args, "recording_id");
      if (recordingId !== undefined) {
        const recording = await getRecording(recordingId);
        if (!recording) throw new Error(`No recording with id ${recordingId}.`);
        return transcriptOf(recording);
      }
      const pageId = optionalNumber(args, "page_id");
      if (pageId === undefined) throw new Error('Pass "page_id" or "recording_id".');
      const page = await requirePage(pageId);
      return (await getPageRecordings(page.id)).map(transcriptOf);
    }
  },
  {
    name: "create_summary",
    description:
      "Save a summary you wrote as a new Notes page: right after the page it summarizes (page_id), or at the end of a module (module_id). The title defaults to “Summary: <source title>”. Use this rather than create_page for summaries, so they're filed the same way every time.",
    inputSchema: {
      type: "object",
      properties: {
        page_id: { type: "number", description: "The page being summarized." },
        module_id: { type: "number", description: "The module being summarized, when it's the whole module." },
        content: { type: "string", description: "The summary as HTML." },
        title: { type: "string", description: "Page title, if not the default." }
      },
      required: ["content"]
    },
    mutates: true,
    describeCall: (args) => {
      const source = typeof args.page_id === "number" ? `page #${args.page_id}` : `module ${pageRef(args, "module_id")}`;
      return `Save a summary of ${source} as a new page.`;
    },
    check: async (args) => {
      requireString(args, "content");
      const pageId = optionalNumber(args, "page_id");
      if (pageId !== undefined) return requirePage(pageId);
      const moduleId = optionalNumber(args, "module_id");
      if (moduleId === undefined) throw new Error('Pass "page_id" or "module_id".');
      return requireModule(moduleId);
    },
    execute: async (args) => {
      const content = requireString(args, "content");
      const title = optionalString(args, "title")?.trim();
      const pageId = optionalNumber(args, "page_id");
      if (pageId !== undefined) {
        const source = await requirePage(pageId);
        return pageSummary(await createPageAfter(source.id, { title: title || `Summary: ${source.title}`, type: PageType.Notes, content }));
      }
      const moduleId = optionalNumber(args, "module_id");
      if (moduleId === undefined) throw new Error('Pass "page_id" or "module_id".');
      const module = await requireModule(moduleId);
      return pageSummary(await createPage(module.id, { title: title || `Summary: ${module.name}`, type: PageType.Notes, content }));
    }
  },
  {
    name: "update_page",
    description:
      "Update an existing page's title, type, content, or completion status. Only the fields provided are changed.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Page id." },
        title: { type: "string" },
        type: { type: "number", description: PAGE_TYPE_DESCRIPTION },
        content: {
          type: "string",
          description:
            'Page body as HTML. Replaces the entire current content, so first re-read it with get_page and reproduce any part you aren\'t intentionally changing byte-for-byte — including <mark data-highlight-ref="..."> tags around text the user highlighted, which must stay wrapped around that exact text.'
        },
        status: { type: "number", description: STATUS_DESCRIPTION }
      },
      required: ["id"]
    },
    mutates: true,
    destructive: (args) => args.content !== undefined,
    describeCall: (args) => {
      const fields = (["title", "type", "content", "status"] as const).filter(
        (key) => args[key] !== undefined
      );
      return `Update page #${typeof args.id === "number" ? args.id : "?"}${fields.length ? ` (${fields.join(", ")})` : ""}.`;
    },
    execute: async (args) =>
      updatePage(requireNumber(args, "id"), {
        title: optionalString(args, "title"),
        type: optionalNumber(args, "type"),
        content: optionalString(args, "content"),
        status: optionalNumber(args, "status")
      })
  }
];
