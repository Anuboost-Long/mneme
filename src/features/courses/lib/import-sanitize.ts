import { PageType } from "./pages";

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
  [/notes?/i, PageType.Notes],
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
const SKIPPED_TAGS = new Set(["script", "style", "nav", "aside", "footer", "form", "button", "iframe", "noscript", "svg"]);
const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "code", "pre",
  "blockquote", "a", "img", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "table", "thead", "tbody", "tr", "th", "td",
]);
const ALLOWED_ATTRIBUTES: Partial<Record<string, string[]>> = {
  a: ["href", "title"],
  img: ["src", "alt", "title"],
};

export function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(text: string) {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// `baseUrl` is omitted for content with no meaningful base to resolve
// against (a local PDF/DOCX/Markdown file) — `new URL(value, undefined)`
// then behaves exactly like `new URL(value)`: an already-absolute http(s)
// link/image still passes through, a relative one throws and gets dropped,
// which is correct since there's no source page to resolve it against.
function resolveUrl(value: string, baseUrl?: string): string | undefined {
  try {
    const resolved = new URL(value, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return undefined;
    return escapeAttr(resolved.href);
  } catch {
    return undefined;
  }
}

export function sanitizeNode(node: Node, baseUrl?: string): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  if (SKIPPED_TAGS.has(tag)) return "";
  const children = Array.from(element.childNodes).map((child) => sanitizeNode(child, baseUrl)).join("");
  if (!ALLOWED_TAGS.has(tag)) return children;
  const attributes = (ALLOWED_ATTRIBUTES[tag] ?? [])
    .map((name) => {
      const value = element.getAttribute(name);
      if (!value) return "";
      const resolved = name === "href" || name === "src" ? resolveUrl(value, baseUrl) : escapeAttr(value);
      return resolved ? ` ${name}="${resolved}"` : "";
    })
    .join("");
  if (tag === "br" || tag === "img") return `<${tag}${attributes} />`;
  return `<${tag}${attributes}>${children}</${tag}>`;
}

export function sanitizeChildren(root: Element, baseUrl?: string): string {
  return Array.from(root.childNodes).map((node) => sanitizeNode(node, baseUrl)).join("").trim();
}
