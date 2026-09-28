import { Marked } from "marked";

// Markdown -> HTML the page editor can take in as its own content. Not
// agent-chat's renderMarkdown: that one wraps code blocks and tables in
// chat-only chrome (copy buttons, scroll regions) that would land in the
// page as stray text. Raw HTML, images, and non-web links in the agent's
// reply are neutralized the same way chat does, and "- [ ]" checklists
// become TipTap's own task list markup so "Extract tasks" inserts real
// checkboxes.
const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

export function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (character) => entities[character]);
}

const markdown = new Marked({
  renderer: {
    checkbox: () => "",
    list(token) {
      if (!token.items.some((item) => item.task)) return false;
      const items = token.items.map((item) => `<li data-type="taskItem" data-checked="${item.checked === true}">${this.parser.parse(item.tokens)}</li>`);
      return `<ul data-type="taskList">${items.join("")}</ul>`;
    },
    html: ({ text }) => escapeHtml(text),
    image: ({ text }) => escapeHtml(text),
    link({ href, tokens }) {
      const text = this.parser.parseInline(tokens);
      if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) return text;
      return `<a href="${escapeHtml(href)}">${text}</a>`;
    },
  },
});

export function markdownToEditorHtml(text: string): string {
  return markdown.parse(text, { async: false });
}
