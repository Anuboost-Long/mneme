import { getModules } from "../../courses/lib/modules";
import { getPages, PageType, type Page } from "../../courses/lib/pages";
import { ActionScope, type AiAction } from "./actions";
import { escapeHtml } from "./editorHtml";

// Page HTML trimmed for an agent to read: images become a placeholder (a
// file reference means nothing to the agent, and a legacy base64 image
// would be megabytes of noise) and every attribute is dropped, keeping
// only the structure — headings, lists, tables, emphasis.
export function compactHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("img").forEach((image) => image.replaceWith(image.alt ? `[image: ${image.alt}]` : "[image]"));
  doc.body.querySelectorAll("*").forEach((element) => {
    for (const { name } of Array.from(element.attributes)) element.removeAttribute(name);
  });
  return doc.body.innerHTML;
}

function pageBlock(page: Page, moduleName?: string) {
  const moduleAttribute = moduleName ? ` module="${escapeHtml(moduleName)}"` : "";
  return `<page title="${escapeHtml(page.title)}" type="${PageType[page.type]}"${moduleAttribute}>\n${compactHtml(page.content ?? "")}\n</page>`;
}

function matchesTypes(action: AiAction, page: Page) {
  return !action.pageTypes || action.pageTypes.includes(page.type);
}

// Every page of the module or course, in the same order the app lists
// them, filtered to the action's page types. Empty string when nothing
// matched — the caller turns that into an error rather than sending an
// agent nothing to work on.
export async function gatherContext(action: AiAction, location: { moduleId: number; courseId: number }): Promise<string> {
  if (action.scope === ActionScope.Module) {
    const pages = await getPages(location.moduleId);
    return pages.filter((page) => matchesTypes(action, page)).map((page) => pageBlock(page)).join("\n\n");
  }
  const blocks: string[] = [];
  for (const module of await getModules(location.courseId)) {
    for (const page of await getPages(module.id)) {
      if (matchesTypes(action, page)) blocks.push(pageBlock(page, module.name));
    }
  }
  return blocks.join("\n\n");
}
