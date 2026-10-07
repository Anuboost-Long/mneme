const BLOCKS = "h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, td, th, figcaption";
const HEADINGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
const PASSAGE_CHARACTERS = 900;
const MAX_PASSAGES = 300;

const clean = (text: string | null) => (text ?? "").replace(/\s+/g, " ").trim();

export function splitIntoPassages(title: string, html: string | null): string[] {
  const document = new DOMParser().parseFromString(`<html><body>${html ?? ""}</body></html>`, "text/html");
  const passages: string[] = [];
  let heading = "";
  let body = "";

  function flush() {
    if (body) passages.push(`${title}${heading ? ` — ${heading}` : ""}: ${body}`);
    body = "";
  }

  for (const element of Array.from(document.querySelectorAll(BLOCKS))) {
    if (element.querySelector(BLOCKS)) continue;
    const text = clean(element.textContent);
    if (!text) continue;
    if (HEADINGS.has(element.tagName)) {
      flush();
      heading = text;
      continue;
    }
    if (body && body.length + text.length > PASSAGE_CHARACTERS) flush();
    body = body ? `${body} ${text}` : text;
  }
  flush();
  return [title, ...passages].slice(0, MAX_PASSAGES);
}
