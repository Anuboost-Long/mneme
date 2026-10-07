import { apiGet } from "@/shared/lib/api";
import { downloadImage } from "@/shared/lib/downloadImage";

import { detectType, escapeHtml, sanitizeChildren, type ParsedImport } from "./import-sanitize";
import { pageImage } from "./page-image";

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
// `apiGet` never runs — the raw HTML it fetches is just an empty
// app shell (confirmed live against a real Notion page: the parser found
// zero headings/paragraphs). Catching known cases by hostname up front
// gives a specific, actionable error instead of a wasted network round
// trip and a generic "no content found" a user can't act on.
const JS_RENDERED_HOSTS: [RegExp, string][] = [
  [/(^|\.)notion\.(so|site)$/i, "Notion"],
  [/(^|\.)docs\.google\.com$/i, "Google Docs"],
  [/(^|\.)coda\.io$/i, "Coda"],
  [/(^|\.)airtable\.com$/i, "Airtable"],
  [/(^|\.)figma\.com$/i, "Figma"]
];

export function knownJsRenderedHost(url: string): string | undefined {
  const hostname = new URL(url).hostname;
  return JS_RENDERED_HOSTS.find(([pattern]) => pattern.test(hostname))?.[1];
}

export async function fetchLmsPage(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!isValidHttpUrl(trimmed)) throw new Error("Enter a valid http:// or https:// URL.");
  const jsRenderedHost = knownJsRenderedHost(trimmed);
  if (jsRenderedHost) {
    throw new Error(
      `${jsRenderedHost} pages load their content with JavaScript after the page opens, so this import can’t read them. Copy the content into the editor directly instead.`
    );
  }
  return (await apiGet(trimmed)).body;
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

// Downloads the page's pictures and stores them like pasted ones, so the
// page works offline and its pictures can reach an AI agent. A picture
// that can't be downloaded (a login-walled site) keeps its web address.
export async function storePageImages(
  html: string,
  onProgress?: (saved: number, total: number) => void,
  download: (url: string) => Promise<File | null> = downloadImage
): Promise<string> {
  const document = new DOMParser().parseFromString(
    `<html><body>${html}</body></html>`,
    "text/html"
  );
  const images = Array.from(document.querySelectorAll("img")).filter((image) =>
    /^https?:/i.test(image.getAttribute("src") ?? "")
  );
  for (const [index, image] of images.entries()) {
    onProgress?.(index, images.length);
    const file = await download(image.getAttribute("src") ?? "");
    const stored = file ? await pageImage(file).catch(() => null) : null;
    if (stored) image.setAttribute("src", stored);
  }
  return document.body.innerHTML;
}

export function isSignInPage(html: string) {
  return (
    new DOMParser().parseFromString(html, "text/html").querySelector("input[type='password']") !==
    null
  );
}

function hasPageContent(html: string) {
  const body = new DOMParser().parseFromString(
    `<html><body>${html}</body></html>`,
    "text/html"
  ).body;
  body.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => heading.remove());
  return Boolean(body.textContent?.trim()) || body.querySelector("img, video, table") !== null;
}

function pageTitle(doc: Document): string {
  const parts = doc.title.trim().split(" | ");
  return (parts.length > 1 ? parts.slice(0, -1).join(" | ") : parts[0]) || "Imported page";
}

function headerDates(doc: Document, root: Element): string {
  return Array.from(doc.querySelectorAll('[data-region="activity-dates"] .date-item'))
    .filter((item) => !root.contains(item))
    .map((item) => `<p>${escapeHtml((item.textContent ?? "").replace(/\s+/g, " ").trim())}</p>`)
    .join("");
}

export function parseLmsPage(html: string, sourceUrl: string): ParsedImport {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = pageTitle(doc);
  const root = contentRoot(doc);
  const pageHtml = headerDates(doc, root) + sanitizeChildren(root, sourceUrl);
  return { title, type: detectType(title), html: hasPageContent(pageHtml) ? pageHtml : "" };
}
