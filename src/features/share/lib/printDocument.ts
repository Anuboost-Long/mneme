export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const styles = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: #171b24;
    font: 11pt/1.6 -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  header { margin-bottom: 8mm; padding-bottom: 4mm; border-bottom: 0.5pt solid #d6d8dc; }
  header h1 { margin: 0; font-size: 20pt; line-height: 1.2; font-weight: 600; }
  header p { margin: 2mm 0 0; color: #5d636d; font-size: 9.5pt; }
  h1, h2, h3, h4 { line-height: 1.3; font-weight: 600; break-after: avoid; }
  main h1 { font-size: 16pt; margin: 7mm 0 2mm; }
  main h2 { font-size: 13.5pt; margin: 6mm 0 2mm; }
  main h3 { font-size: 12pt; margin: 5mm 0 1.5mm; }
  p { margin: 0 0 2.5mm; orphans: 3; widows: 3; }
  ul, ol { margin: 0 0 2.5mm; padding-left: 6mm; }
  li { margin: 0.5mm 0; }
  li > p { margin: 0; }
  ul[data-type="taskList"] { list-style: none; padding-left: 0; }
  ul[data-type="taskList"] li { display: flex; gap: 2mm; align-items: baseline; }
  ul[data-type="taskList"] li > label { flex: none; }
  ul[data-type="taskList"] li[data-checked="true"] > div { color: #5d636d; text-decoration: line-through; }
  a { color: inherit; text-decoration: underline; text-underline-offset: 1.5pt; }
  mark { background: #e3fbab; color: inherit; border-radius: 1.5pt; }
  code { background: #f1f2f3; padding: 0.3mm 1mm; border-radius: 1mm; font: 0.9em ui-monospace, Menlo, monospace; }
  pre { background: #f1f2f3; padding: 3mm 4mm; border-radius: 2mm; white-space: pre-wrap; break-inside: avoid; }
  pre code { background: none; padding: 0; }
  blockquote { margin: 0 0 2.5mm; padding-left: 4mm; border-left: 1pt solid #d6d8dc; color: #5d636d; }
  hr { border: 0; border-top: 0.5pt solid #d6d8dc; margin: 5mm 0; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 3mm; font-size: 10pt; }
  th, td { border: 0.5pt solid #d6d8dc; padding: 1.5mm 2mm; text-align: left; vertical-align: top; }
  th { background: #f4f5f6; font-weight: 600; }
  tr, img, figure, aside, details { break-inside: avoid; }
  img { display: block; max-width: 100%; height: auto; margin: 0 auto 3mm; border-radius: 1.5mm; }
  img[data-align="left"] { margin-left: 0; max-width: 50%; }
  img[data-align="right"] { margin-right: 0; max-width: 50%; }
  figcaption { margin-top: -1.5mm; margin-bottom: 3mm; color: #5d636d; font-size: 9pt; text-align: center; }
  aside[data-callout] { margin: 0 0 3mm; padding: 3mm 4mm; border-radius: 2mm; background: #f4f5f6; }
  aside[data-callout] > :last-child { margin-bottom: 0; }
  details > summary { font-weight: 600; list-style: none; }
  .media { margin: 0 0 2.5mm; color: #5d636d; font-size: 9.5pt; }
  .cards { list-style: none; padding: 0; margin: 0; }
  .card { display: flex; gap: 4mm; padding: 3.5mm 0; border-bottom: 0.5pt solid #e4e5e7; break-inside: avoid; }
  .card:first-child { padding-top: 0; }
  .card-number { flex: none; width: 7mm; color: #5d636d; font-variant-numeric: tabular-nums; }
  .card-front { margin: 0; font-weight: 600; }
  .card-back { margin: 1mm 0 0; white-space: pre-wrap; }
  .card-source { margin: 1.5mm 0 0; color: #5d636d; font-size: 9pt; }
`;

export function printDocument({ title, details, body }: { title: string; details: string; body: string }) {
  return `<!doctype html>
<html lang="${escapeHtml(document.documentElement.lang || "en")}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${styles}</style>
</head>
<body>
<header>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(details)}</p>
</header>
<main>${body}</main>
</body>
</html>`;
}

export function todayLabel() {
  return new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}
