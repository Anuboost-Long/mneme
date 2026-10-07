import {
  clearHighlightOrphaned,
  deleteHighlightRow,
  orphanHighlightsExcept,
  upsertHighlights
} from "./table";

export { getModuleHighlights } from "./table";

const REF_ATTR = "data-highlight-ref";

type Fragment = { html: string; list?: Element; item?: Element };

function parseHighlightMarks(pageHtml: string): { ref: string; html: string }[] {
  const doc = new DOMParser().parseFromString(pageHtml, "text/html");
  const byRef = new Map<string, Fragment[]>();
  for (const mark of doc.querySelectorAll(`mark[${REF_ATTR}]`)) {
    const ref = mark.getAttribute(REF_ATTR);
    if (!ref || !(mark.textContent ?? "").trim()) continue;
    const fragment = { html: mark.innerHTML.trim(), ...enclosingListItem(mark) };
    const parts = byRef.get(ref);
    if (parts) parts.push(fragment);
    else byRef.set(ref, [fragment]);
  }
  return Array.from(byRef, ([ref, parts]) => ({ ref, html: renderFragments(parts) }));
}

function enclosingListItem(mark: Element): { list: Element; item: Element } | null {
  const item = mark.closest("li");
  const list = item?.parentElement;
  if (!item || !list || !["UL", "OL"].includes(list.tagName) || list.dataset.type !== undefined)
    return null;
  return { list, item };
}

function renderFragments(fragments: Fragment[]): string {
  let html = "";
  for (const [index, fragment] of fragments.entries()) {
    const paragraph = `<p>${fragment.html}</p>`;
    const { list, item } = fragment;
    if (!list || !item) {
      html += paragraph;
      continue;
    }
    const previous = fragments[index - 1];
    const next = fragments[index + 1];
    const tag = list.tagName.toLowerCase();
    if (previous?.list !== list) html += `<${tag}>`;
    if (previous?.item !== item) {
      const value =
        tag === "ol"
          ? ` value="${Number(list.getAttribute("start") ?? 1) + Array.from(list.children).indexOf(item)}"`
          : "";
      html += `<li${value}>`;
    }
    html += paragraph;
    if (next?.item !== item) html += "</li>";
    if (next?.list !== list) html += `</${tag}>`;
  }
  return html;
}

function parseRawMarks(html: string): { ref: string; innerHtml: string }[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const marks: { ref: string; innerHtml: string }[] = [];
  for (const mark of doc.querySelectorAll(`mark[${REF_ATTR}]`)) {
    const ref = mark.getAttribute(REF_ATTR);
    const innerHtml = mark.innerHTML.trim();
    if (ref && innerHtml) marks.push({ ref, innerHtml });
  }
  return marks;
}

function countOccurrences(haystack: string, needle: string): number {
  return needle ? haystack.split(needle).length - 1 : 0;
}

export function reconcileHighlights(
  previousContent: string | null,
  nextContent: string | null
): string | null {
  if (!previousContent || !nextContent) return nextContent;
  const previousMarks = parseRawMarks(previousContent);
  if (previousMarks.length === 0) return nextContent;
  const nextRefs = new Set(parseHighlightMarks(nextContent).map((mark) => mark.ref));
  let content = nextContent;
  for (const mark of previousMarks) {
    if (nextRefs.has(mark.ref)) continue;
    if (countOccurrences(content, mark.innerHtml) !== 1) continue;
    content = content.replace(
      mark.innerHtml,
      `<mark ${REF_ATTR}="${mark.ref}">${mark.innerHtml}</mark>`
    );
  }
  return content;
}

export async function syncPageHighlights(
  pageId: number,
  moduleId: number,
  pageHtml: string | null
) {
  const marks = pageHtml ? parseHighlightMarks(pageHtml) : [];
  await orphanHighlightsExcept(
    pageId,
    marks.map((mark) => mark.ref)
  );
  await upsertHighlights(
    marks.map((mark, position) => ({
      page_id: pageId,
      module_id: moduleId,
      ref: mark.ref,
      html: mark.html,
      position
    }))
  );
}

export async function deleteHighlight(id: number): Promise<void> {
  await deleteHighlightRow(id);
}

export async function keepOrphanedHighlight(id: number): Promise<void> {
  await clearHighlightOrphaned(id);
}

export function stripHighlight(html: string, ref: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const marks = doc.querySelectorAll(`mark[${REF_ATTR}="${CSS.escape(ref)}"]`);
  if (marks.length === 0) return html;
  marks.forEach((mark) => mark.replaceWith(...Array.from(mark.childNodes)));
  return doc.body.innerHTML;
}
