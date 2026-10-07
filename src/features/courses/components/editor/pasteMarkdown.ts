const BLOCK_MARKERS = [
  /^#{1,6} \S/, // heading
  /^[-*+] \S/, // bullet or checklist item
  /^\d{1,3}[.)] \S/, // numbered item
  /^```/, // code fence
  /^> ?\S/ // quote
];

const isTableRow = (line: string) => line.length > 2 && line.startsWith("|") && line.endsWith("|");

const INLINE_MARKERS = [/\*\*[^*\n]{1,200}\*\*/, /`[^`\n]{1,200}`/, /\[[^\]\n]{1,200}\]\([^)\s]{1,500}\)/, /(?:^|\s)_[^_\n]{1,200}_(?:\s|$)/];

// Plain text that reads as markdown: any block marker, or at least two
// kinds of inline one (a lone "*" or "_" in prose isn't enough).
export function looksLikeMarkdown(text: string) {
  const lines = text.split("\n").map((line) => line.trim());
  if (lines.some((line) => isTableRow(line) || BLOCK_MARKERS.some((marker) => marker.test(line)))) return true;
  return INLINE_MARKERS.filter((marker) => marker.test(text)).length >= 2;
}

// Formatted HTML from a web page, Word or Docs already carries its
// structure; only plain text (or HTML with no structure, like a code
// editor's) is worth reading as markdown.
export function hasStructuredHtml(html: string) {
  return /<(h[1-6]|p|ul|ol|li|table|blockquote|pre)[\s>]/i.test(html);
}
