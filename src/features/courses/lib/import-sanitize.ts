import { PageType } from "./page/types";

export type ParsedImport = {
  title: string;
  type: PageType;
  html: string;
};

const TYPE_PATTERNS: [RegExp, PageType][] = [
  [/discussion/i, PageType.Discussion],
  [/assignment/i, PageType.Assignment],
  [/exercise|activity|quiz|practice/i, PageType.Exercise],
  [/lecture/i, PageType.Lecture],
  [/reading/i, PageType.Reading],
  [/revision|review/i, PageType.Revision],
  [/notes?/i, PageType.Notes]
];

export function detectType(title: string): PageType {
  for (const [pattern, type] of TYPE_PATTERNS) if (pattern.test(title)) return type;
  return PageType.Lesson;
}

// `aside` holds page furniture (tables of contents, "related pages" widgets,
// quicklink menus) that real sites nest *inside* <main>/<article> rather than
// beside it, so skipping only <nav> misses it — confirmed against a real MDN
// page, where both the left quicklinks and right table-of-contents are
// <aside> elements inside <main>.
const SKIPPED_TAGS = new Set([
  "script",
  "style",
  "nav",
  "aside",
  "footer",
  "form",
  "button",
  "iframe",
  "noscript",
  "svg"
]);
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "code",
  "pre",
  "blockquote",
  "a",
  "img",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td"
]);
const ALLOWED_ATTRIBUTES: Partial<Record<string, string[]>> = {
  a: ["href", "title"],
  img: ["src", "alt", "title"]
};

export function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeAttr(text: string) {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// `baseUrl` is omitted for content with no meaningful base to resolve
// against (a local PDF/DOCX/Markdown file) — `new URL(value, undefined)`
// then behaves exactly like `new URL(value)`: an already-absolute http(s)
// link/image still passes through, a relative one throws and gets dropped,
// which is correct since there's no source page to resolve it against.
// `stored` holds image URLs the importer itself just saved through
// desktop.files: asset-protocol URLs, trusted exactly and nothing wider.
function resolveUrl(
  value: string,
  baseUrl?: string,
  stored?: ReadonlySet<string>
): string | undefined {
  if (stored?.has(value)) return escapeAttr(value);
  try {
    const resolved = new URL(value, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return undefined;
    return escapeAttr(resolved.href);
  } catch {
    return undefined;
  }
}

const SECTION_LINE = /^(?:week|module|topic|lesson|lecture|unit|session|part|section|chapter)\s+(?:\d+|[ivx]+|[a-z])\b/i;
const MAX_HEADING_LINE = 80;

function isHeadingLine(element: Element) {
  if (element.tagName.toLowerCase() !== "p" || element.closest("li, td, th")) return false;
  const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!text || text.length > MAX_HEADING_LINE || /[.!?,;]$/.test(text)) return false;
  if (SECTION_LINE.test(text)) return true;
  const bold = Array.from(element.querySelectorAll("strong, b"), (part) => part.textContent ?? "").join("");
  return bold.replace(/\s+/g, " ").trim() === text;
}

export function sanitizeNode(node: Node, baseUrl?: string, stored?: ReadonlySet<string>): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const element = node as Element;
  const tag = isHeadingLine(element) ? "h3" : element.tagName.toLowerCase();
  if (SKIPPED_TAGS.has(tag)) return "";
  const children = Array.from(element.childNodes)
    .map((child) => sanitizeNode(child, baseUrl, stored))
    .join("");
  if (!ALLOWED_TAGS.has(tag)) return children;
  const attributes = (ALLOWED_ATTRIBUTES[tag] ?? [])
    .map((name) => {
      const value = element.getAttribute(name);
      if (!value) return "";
      const resolved =
        name === "href" || name === "src" ? resolveUrl(value, baseUrl, stored) : escapeAttr(value);
      return resolved ? ` ${name}="${resolved}"` : "";
    })
    .join("");
  if (tag === "br" || tag === "img") return `<${tag}${attributes} />`;
  return `<${tag}${attributes}>${children}</${tag}>`;
}

export function sanitizeChildren(
  root: Element,
  baseUrl?: string,
  stored?: ReadonlySet<string>
): string {
  return Array.from(root.childNodes)
    .map((node) => sanitizeNode(node, baseUrl, stored))
    .join("")
    .trim();
}

const ACTIVITY_WORDS = [
  "exercise",
  "discussion",
  "assignment",
  "assessment",
  "activity",
  "quiz",
  "lab",
  "practical",
  "tutorial",
  "worksheet",
  "homework",
  "project",
  "task",
  "challenge",
  "case study",
  "reflection",
  "problem set",
  "knowledge check"
].join("|");
const ACTIVITY_NAME = new RegExp(String.raw`^(${ACTIVITY_WORDS})s?\b\s*([\d.]+[a-z]?)?\s*([:.\-–—]\s*\S.*)?$`, "i");
const NAMED_BY_MARKUP = "h1, h2, h3, h4, h5, h6, a, strong, b";
const MAX_ACTIVITY_LENGTH = 100;
const MAX_ACTIVITIES = 30;

export function findActivities(html: string): string[] {
  const document = new DOMParser().parseFromString(html, "text/html");
  const found = new Map<string, string>();
  for (const element of Array.from(document.querySelectorAll(`${NAMED_BY_MARKUP}, li, p`))) {
    const name = (element.textContent ?? "").replace(/\s+/g, " ").trim();
    const match = ACTIVITY_NAME.exec(name);
    if (!match || name.length > MAX_ACTIVITY_LENGTH) continue;
    if (!match[2] && !element.matches(NAMED_BY_MARKUP)) continue;
    const key = name.toLowerCase();
    if (!found.has(key)) found.set(key, name);
    if (found.size === MAX_ACTIVITIES) break;
  }
  return [...found.values()];
}

export function activityChecklist(names: string[]) {
  if (names.length === 0) return "";
  const items = names
    .map((name) => `<li data-type="taskItem" data-checked="false"><p>${escapeHtml(name)}</p></li>`)
    .join("");
  return `<h2>Activities</h2><ul data-type="taskList">${items}</ul>`;
}
