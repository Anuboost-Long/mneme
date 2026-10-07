import type { Editor } from "@tiptap/react";

// Each line becomes its own paragraph, then the whole run is selected so
// the editor's AI actions (Summarize, Clean transcript, …) apply to it.
export function insertParagraphs(
  editor: Editor,
  text: string,
  range: { from: number; to?: number }
) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return;
  const content = lines.map((line) => ({
    type: "paragraph",
    content: [{ type: "text", text: line }]
  }));
  const size = lines.reduce((total, line) => total + line.length + 2, 0);
  const target = range.to === undefined ? range.from : { from: range.from, to: range.to };
  editor
    .chain()
    .focus()
    .insertContentAt(target, content)
    .setTextSelection({ from: range.from + 1, to: range.from + size - 1 })
    .run();
}
