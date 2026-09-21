import { desktop } from "@chain/sdk";
import type { HighlightRow } from "../../../shared/lib/db/schema/highlight";

export type Highlight = HighlightRow;

const REF_ATTR = "data-highlight-ref";

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
// as separate paragraphs rather than one run-on line.
function parseHighlightMarks(pageHtml: string): { ref: string; html: string }[] {
  const doc = new DOMParser().parseFromString(pageHtml, "text/html");
  const byRef = new Map<string, string[]>();
  for (const mark of doc.querySelectorAll(`mark[${REF_ATTR}]`)) {
    const ref = mark.getAttribute(REF_ATTR);
    if (!ref || !(mark.textContent ?? "").trim()) continue;
    const fragment = mark.innerHTML.trim();
    const parts = byRef.get(ref);
    if (parts) parts.push(fragment);
    else byRef.set(ref, [fragment]);
  }
  return Array.from(byRef, ([ref, parts]) => ({ ref, html: parts.map((part) => `<p>${part}</p>`).join("") }));
}

// Keeps the `highlight` table's rows for one page in step with whatever
// marks its just-saved content actually contains — called from
// pages.ts's createPage/updatePage whenever content is written, so every
// path that saves a page (the rich-text editor, PageForm, the agent's
// create_page/update_page tools) keeps highlights in sync the same way,
// not just the editor.
export async function syncPageHighlights(pageId: number, moduleId: number, pageHtml: string | null) {
  const marks = pageHtml ? parseHighlightMarks(pageHtml) : [];
  if (marks.length === 0) {
    await desktop.storage.execute("DELETE FROM highlight WHERE page_id = ?", [pageId]);
    return;
  }
  const refs = marks.map((mark) => mark.ref);
  const placeholders = refs.map(() => "?").join(", ");
  await desktop.storage.execute(
    `DELETE FROM highlight WHERE page_id = ? AND ref NOT IN (${placeholders})`,
    [pageId, ...refs],
  );
  for (const [position, mark] of marks.entries()) {
    await desktop.storage.execute(
      `INSERT INTO highlight (page_id, module_id, ref, html, position) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(page_id, ref) DO UPDATE SET html = excluded.html, position = excluded.position, module_id = excluded.module_id`,
      [pageId, moduleId, mark.ref, mark.html, position],
    );
  }
}

export async function getModuleHighlights(moduleId: number): Promise<Highlight[]> {
  return desktop.storage.query<Highlight>(
    "SELECT * FROM highlight WHERE module_id = ? ORDER BY page_id, position",
    [moduleId],
  );
}

// Unwraps every highlighted mark matching `ref` in `html` — plural for the
// same reason parseHighlightMarks groups by ref: a highlight spanning
// several blocks is several <mark> elements sharing one ref, and leaving
// any of them behind would un-highlight the excerpt everywhere except
// where the user first selected it. Pure — the caller reads the page's
// current content, calls this, then saves the result through updatePage
// the same way any other content edit is saved (which re-runs
// syncPageHighlights, so the table follows without a separate delete).
export function stripHighlight(html: string, ref: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const marks = doc.querySelectorAll(`mark[${REF_ATTR}="${CSS.escape(ref)}"]`);
  if (marks.length === 0) return html;
  marks.forEach((mark) => mark.replaceWith(...Array.from(mark.childNodes)));
  return doc.body.innerHTML;
}
