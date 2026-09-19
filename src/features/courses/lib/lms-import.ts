import { desktop, type ChainError } from "@chain/sdk";
import { detectType, sanitizeChildren, type ParsedImport } from "./import-sanitize";

export type { ParsedImport };

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// These render their actual content client-side via JavaScript, which
// `desktop.http.get` never runs — the raw HTML it fetches is just an empty
// app shell (confirmed live against a real Notion page: the parser found
// zero headings/paragraphs). Catching known cases by hostname up front
// gives a specific, actionable error instead of a wasted network round
// trip and a generic "no content found" a user can't act on.
const JS_RENDERED_HOSTS: [RegExp, string][] = [
  [/(^|\.)notion\.(so|site)$/i, "Notion"],
  [/(^|\.)docs\.google\.com$/i, "Google Docs"],
  [/(^|\.)coda\.io$/i, "Coda"],
  [/(^|\.)airtable\.com$/i, "Airtable"],
  [/(^|\.)figma\.com$/i, "Figma"],
];

function knownJsRenderedHost(url: string): string | undefined {
  const hostname = new URL(url).hostname;
  return JS_RENDERED_HOSTS.find(([pattern]) => pattern.test(hostname))?.[1];
}

export async function fetchLmsPage(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!isValidHttpUrl(trimmed)) throw new Error("Enter a valid http:// or https:// URL.");
  const jsRenderedHost = knownJsRenderedHost(trimmed);
  if (jsRenderedHost) {
    throw new Error(`${jsRenderedHost} pages load their content with JavaScript after the page opens, so this import can’t read them. Copy the content into the editor directly instead.`);
  }
  let response;
  try {
    response = await desktop.http.get(trimmed);
  } catch (caught) {
    const code = (caught as ChainError)?.code;
    if (code === "UNAVAILABLE") throw new Error("Couldn’t reach that page. Check the URL and your connection.");
    if (code === "INVALID_ARGUMENT") throw new Error("That doesn’t look like a valid page URL.");
    throw new Error("Couldn’t fetch that page. Try again.");
  }
  if (!response.ok) throw new Error(`The page responded with an error (status ${response.status}).`);
  return response.body;
}

// Site chrome — top nav, breadcrumbs, "skip to content" links — usually
// lives as a sibling of the real content landmark rather than inside it, so
// it survives sanitizeNode's tag-based filtering when the whole <body> is
// walked. Scoping to the content landmark itself (falling back to <body>
// only when a page has none) discards that chrome by construction instead
// of trying to pattern-match every site's nav markup.
function contentRoot(doc: Document): Element {
  return doc.querySelector("main, article, [role='main']") ?? doc.body;
}

export function parseLmsPage(html: string, sourceUrl: string): ParsedImport {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = doc.title.trim() || "Imported page";
  const pageHtml = sanitizeChildren(contentRoot(doc), sourceUrl);
  return { title, type: detectType(title), html: pageHtml };
}
