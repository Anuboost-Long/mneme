import { desktop } from "@chain/sdk";
import type { HighlightRow } from "../../../shared/lib/db/schema/highlight";

export type Highlight = HighlightRow;

const REF_ATTR = "data-highlight-ref";
const UPSERT_BATCH = 200;

// The single place both syncPageHighlights and stripHighlight agree on
// what counts as a highlight in a page's own saved HTML.
//
// One highlight action can serialize into several sibling <mark> elements
// sharing the same ref — HTML can't have one inline mark span across a
// block boundary, so a selection crossing paragraphs/list items comes back
// from getHTML() as one <mark> per block. Grouping by ref here (instead of
// treating each <mark> as its own row) is what keeps that whole selection
// together as one highlight instead of only its last fragment surviving.
// Each fragment keeps its own inner HTML (not textContent) so formatting
// survives, wrapped in its own <p> so a multi-block highlight still reads
// as separate paragraphs rather than one run-on line — and, for a fragment
// inside a bullet or numbered list, in that list too (see renderFragments).
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

type Fragment = { html: string; list?: Element; item?: Element };

// The bullet or numbered list a mark sits in, if any. Task lists are left
// out — their marker is a checkbox, which an excerpt has nothing to bind to.
function enclosingListItem(mark: Element): { list: Element; item: Element } | null {
  const item = mark.closest("li");
  const list = item?.parentElement;
  if (!item || !list || !["UL", "OL"].includes(list.tagName) || list.dataset.type !== undefined) return null;
  return { list, item };
}

// Rebuilds the list around consecutive fragments from the same list, so
// the excerpt keeps its bullets/numbers. A numbered item carries its
// original number as `value`, so highlighting only item 3 still shows "3."
// rather than restarting at 1.
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
      const value = tag === "ol" ? ` value="${Number(list.getAttribute("start") ?? 1) + Array.from(list.children).indexOf(item)}"` : "";
      html += `<li${value}>`;
    }
    html += paragraph;
    if (next?.item !== item) html += "</li>";
    if (next?.list !== list) html += `</${tag}>`;
  }
  return html;
}

// Every individual <mark data-highlight-ref> element in `html`, ungrouped
// (unlike parseHighlightMarks, which stitches a multi-block highlight's
// fragments into one display string) — reconcileHighlights needs each
// block's own exact fragment to search for on its own.
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

// Before new content overwrites a page's old content, checks whether a
// previously-highlighted fragment vanished only because its <mark>
// wrapper was dropped — its exact markup is still sitting there,
// unchanged, just unwrapped. That's the common failure mode when
// something rewrites a page's HTML without reproducing marks it had no
// reason to touch (most often the AI agent's update_page tool): the text
// itself is untouched, so the highlight should survive right where it
// was. Reinjects the mark there. A fragment that isn't found at all, or
// that now matches more than once (too ambiguous to place with
// confidence), is left alone for syncPageHighlights to flag as orphaned
// instead of guessing.
export function reconcileHighlights(previousContent: string | null, nextContent: string | null): string | null {
  if (!previousContent || !nextContent) return nextContent;
  const previousMarks = parseRawMarks(previousContent);
  if (previousMarks.length === 0) return nextContent;
  const nextRefs = new Set(parseHighlightMarks(nextContent).map((mark) => mark.ref));
  let content = nextContent;
  for (const mark of previousMarks) {
    if (nextRefs.has(mark.ref)) continue;
    if (countOccurrences(content, mark.innerHtml) !== 1) continue;
    content = content.replace(mark.innerHtml, `<mark ${REF_ATTR}="${mark.ref}">${mark.innerHtml}</mark>`);
  }
  return content;
}

// Keeps the `highlight` table's rows for one page in step with whatever
// marks its just-saved content actually contains — called from
// pages.ts's createPage/updatePage whenever content is written, so every
// path that saves a page (the rich-text editor, PageForm, the agent's
// create_page/update_page tools) keeps highlights in sync the same way,
// not just the editor. A ref whose mark is gone from the content isn't
// deleted — reconcileHighlights already reinjected anything whose text
// survived unchanged, so a ref still missing here means the highlighted
// text was genuinely edited or removed; it's flagged orphaned instead,
// so the user can decide whether to keep it as a standalone note (see
// ModuleHighlightsPage) or remove it.
export async function syncPageHighlights(pageId: number, moduleId: number, pageHtml: string | null) {
  const marks = pageHtml ? parseHighlightMarks(pageHtml) : [];
  const activeRefs = marks.map((mark) => mark.ref);
  if (activeRefs.length > 0) {
    const placeholders = activeRefs.map(() => "?").join(", ");
    await desktop.storage.execute(
      `UPDATE highlight SET orphaned_at = datetime('now') WHERE page_id = ? AND orphaned_at IS NULL AND ref NOT IN (${placeholders})`,
      [pageId, ...activeRefs],
    );
  } else {
    await desktop.storage.execute(
      "UPDATE highlight SET orphaned_at = datetime('now') WHERE page_id = ? AND orphaned_at IS NULL",
      [pageId],
    );
  }
  for (let start = 0; start < marks.length; start += UPSERT_BATCH) {
    const batch = marks.slice(start, start + UPSERT_BATCH);
    await desktop.storage.execute(
      `INSERT INTO highlight (page_id, module_id, ref, html, position) VALUES ${batch.map(() => "(?, ?, ?, ?, ?)").join(", ")}
       ON CONFLICT(page_id, ref) DO UPDATE SET html = excluded.html, position = excluded.position, module_id = excluded.module_id, orphaned_at = NULL`,
      batch.flatMap((mark, index) => [pageId, moduleId, mark.ref, mark.html, start + index]),
    );
  }
}

export async function getModuleHighlights(moduleId: number): Promise<Highlight[]> {
  return desktop.storage.query<Highlight>(
    "SELECT * FROM highlight WHERE module_id = ? AND page_id IN (SELECT id FROM page WHERE deleted_at IS NULL) ORDER BY page_id, position",
    [moduleId],
  );
}

// An orphaned highlight (see syncPageHighlights) has no mark left in its
// page's content, so there's nothing for stripHighlight to unwrap —
// removing it is just deleting the row.
export async function deleteHighlight(id: number): Promise<void> {
  await desktop.storage.execute("DELETE FROM highlight WHERE id = ?", [id]);
}

// The user chose to keep an orphaned highlight as a standalone note even
// though its text is no longer found on the page — clears the flag so it
// stops being offered the keep/remove choice.
export async function keepOrphanedHighlight(id: number): Promise<void> {
  await desktop.storage.execute("UPDATE highlight SET orphaned_at = NULL WHERE id = ?", [id]);
}

// Unwraps every highlighted mark matching `ref` in `html` — plural for the
// same reason parseHighlightMarks groups by ref: a highlight spanning
// several blocks is several <mark> elements sharing one ref, and leaving
// any of them behind would un-highlight the excerpt everywhere except
// where the user first selected it. Pure — the caller reads the page's
// current content, calls this, then saves the result through updatePage
// the same way any other content edit is saved. That re-runs
// syncPageHighlights, which only orphans the row, so the caller deletes
// it too (see ModuleHighlightsPage's remove).
export function stripHighlight(html: string, ref: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const marks = doc.querySelectorAll(`mark[${REF_ATTR}="${CSS.escape(ref)}"]`);
  if (marks.length === 0) return html;
  marks.forEach((mark) => mark.replaceWith(...Array.from(mark.childNodes)));
  return doc.body.innerHTML;
}
