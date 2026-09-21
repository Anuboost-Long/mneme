import { Marked } from "marked";

function escape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const markdown = new Marked({
  renderer: {
    code({ text, lang }) {
      const language = lang?.trim().split(/\s+/)[0] || "Code";
      return `<figure class="my-4 overflow-hidden rounded-xl border border-ink/10 bg-ink/4"><figcaption class="flex items-center justify-between gap-3 border-b border-ink/8 px-4 py-2 text-xs text-muted"><span>${escape(language)}</span><button type="button" data-copy-code class="rounded px-2 py-1 text-ink hover:bg-ink/8 focus-visible:outline-2 focus-visible:outline-offset-2">Copy code</button></figcaption><pre tabindex="0" aria-label="${escape(language)} code" class="overflow-x-auto p-4 text-xs leading-6"><code>${escape(text)}</code></pre></figure>`;
    },
    table(token) {
      const row = (cells: typeof token.header, header = false) => `<tr>${cells.map((cell) => {
        const tag = header ? "th" : "td";
        const alignment = cell.align === "center" ? "text-center" : cell.align === "right" ? "text-right" : "text-left";
        return `<${tag}${header ? ' scope="col"' : ""} class="${alignment} border-b border-ink/10 px-4 py-3 align-top ${header ? "font-semibold" : ""}">${this.parser.parseInline(cell.tokens)}</${tag}>`;
      }).join("")}</tr>`;
      return `<div tabindex="0" role="region" aria-label="Table" class="my-4 overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"><table class="w-full border-collapse text-sm leading-6"><thead class="bg-ink/4">${row(token.header, true)}</thead><tbody>${token.rows.map((cells) => row(cells)).join("")}</tbody></table></div>`;
    },
    html: ({ text }) => escape(text),
    image: ({ text }) => escape(text),
    link({ href, tokens }) {
      const text = this.parser.parseInline(tokens);
      if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) return text;
      return `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  },
});

export function renderMarkdown(text: string): string {
  return markdown.parse(text, { async: false });
}
