import { isProbablyReaderable, Readability } from "@mozilla/readability";

import { detectType, escapeHtml, sanitizeChildren, type ParsedImport } from "./import-sanitize";

const LMS_ADDRESSES = [
  /\/mod\/[a-z]+\/view\.php/i,
  /\/course\/view\.php/i,
  /\/courses\/\d+/i,
  /\/d2l\//i,
  /\/webapps\//i,
  /\/ultra\//i,
  /(^|\.)(moodle|canvas|instructure|brightspace|blackboard|d2l)\./i
];

export function isLmsAddress(url: string) {
  try {
    const { hostname, pathname } = new URL(url);
    return LMS_ADDRESSES.some((pattern) => pattern.test(pathname) || pattern.test(hostname));
  } catch {
    return false;
  }
}

function published(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function readArticle(html: string, url: string): ParsedImport | null {
  if (isLmsAddress(url)) return null;
  const document = new DOMParser().parseFromString(html, "text/html");
  const base = document.createElement("base");
  base.href = url;
  document.head.prepend(base);
  if (!isProbablyReaderable(document)) return null;
  const article = new Readability(document).parse();
  if (!article?.content) return null;
  const body = new DOMParser().parseFromString(
    `<html><body>${article.content}</body></html>`,
    "text/html"
  ).body;
  const content = sanitizeChildren(body, url);
  if (!content) return null;
  const byline = [
    article.byline?.trim(),
    article.siteName?.trim(),
    published(article.publishedTime)
  ]
    .filter(Boolean)
    .join(" · ");
  const title = article.title?.trim() || new URL(url).hostname;
  return {
    title,
    type: detectType(title),
    html: (byline ? `<p><em>${escapeHtml(byline)}</em></p>` : "") + content
  };
}
