import type { Editor } from "@tiptap/react";

import { pickImage } from "../../lib/page-image";

// The `/` menu lists its commands under these headings, in this order.
export const slashCategories = ["Text", "Lists", "Insert", "AI"] as const;

export type SlashCategory = (typeof slashCategories)[number];

// One entry in the `/` menu. `keywords` are other words that find it
// (`/h1`, `/todo`, `/audio`).
export type SlashItem = {
  id: string;
  label: string;
  hint: string;
  category: SlashCategory;
  keywords?: string[];
  run: (editor: Editor) => void;
};

// A block type: also a "Turn into" choice, so it knows when it's active.
export type BlockCommand = SlashItem & { isActive: (editor: Editor) => boolean };

export function matchesSlashQuery({ label, category, keywords = [] }: SlashItem, query: string) {
  const wanted = query.trim().toLowerCase();
  return [label, category, ...keywords].some((word) => word.toLowerCase().includes(wanted));
}

export const blockCommands: BlockCommand[] = [
  {
    id: "paragraph",
    category: "Text",
    keywords: ["plain", "paragraph"],
    label: "Text",
    hint: "Plain paragraph",
    isActive: (editor) =>
      editor.isActive("paragraph") &&
      !editor.isActive("bulletList") &&
      !editor.isActive("orderedList") &&
      !editor.isActive("taskList"),
    run: (editor) => editor.chain().focus().setParagraph().run()
  },
  {
    id: "heading1",
    category: "Text",
    keywords: ["h1", "title"],
    label: "Heading 1",
    hint: "Large section heading",
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
  },
  {
    id: "heading2",
    category: "Text",
    keywords: ["h2", "subtitle"],
    label: "Heading 2",
    hint: "Medium section heading",
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
  },
  {
    id: "heading3",
    category: "Text",
    keywords: ["h3"],
    label: "Heading 3",
    hint: "Small section heading",
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
  },
  {
    id: "bulletList",
    category: "Lists",
    keywords: ["ul", "bullet"],
    label: "Bulleted list",
    hint: "Simple bulleted list",
    isActive: (editor) => editor.isActive("bulletList"),
    run: (editor) => editor.chain().focus().toggleBulletList().run()
  },
  {
    id: "orderedList",
    category: "Lists",
    keywords: ["ol", "numbered"],
    label: "Numbered list",
    hint: "List with numbering",
    isActive: (editor) => editor.isActive("orderedList"),
    run: (editor) => editor.chain().focus().toggleOrderedList().run()
  },
  {
    id: "taskList",
    category: "Lists",
    keywords: ["todo", "to-do", "checkbox"],
    label: "Checklist",
    hint: "To-do list with checkboxes",
    isActive: (editor) => editor.isActive("taskList"),
    run: (editor) => editor.chain().focus().toggleTaskList().run()
  },
  {
    id: "blockquote",
    category: "Text",
    keywords: ["blockquote", "citation"],
    label: "Quote",
    hint: "Capture a quote",
    isActive: (editor) => editor.isActive("blockquote"),
    run: (editor) => editor.chain().focus().toggleBlockquote().run()
  },
  {
    id: "callout",
    category: "Text",
    keywords: ["note", "tip", "warning", "info", "aside"],
    label: "Callout",
    hint: "Note, tip or warning that stands out",
    isActive: (editor) => editor.isActive("callout"),
    run: (editor) => editor.chain().focus().toggleCallout().run()
  },
  {
    id: "details",
    category: "Text",
    keywords: ["toggle", "collapse", "fold", "expand", "details"],
    label: "Collapsible section",
    hint: "Title that folds its content away",
    isActive: (editor) => editor.isActive("details"),
    run: (editor) => editor.chain().focus().setDetails().run()
  },
  {
    id: "codeBlock",
    category: "Insert",
    keywords: ["code", "snippet"],
    label: "Code block",
    hint: "Multi-line code snippet",
    isActive: (editor) => editor.isActive("codeBlock"),
    run: (editor) => editor.chain().focus().toggleCodeBlock().run()
  },
  {
    id: "table",
    category: "Insert",
    keywords: ["grid", "rows", "columns"],
    label: "Table",
    hint: "Insert a 3x3 table",
    isActive: () => false,
    run: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  },
  {
    id: "horizontalRule",
    category: "Insert",
    keywords: ["divider", "hr", "line", "separator"],
    label: "Divider",
    hint: "Visual section break",
    isActive: () => false,
    run: (editor) => editor.chain().focus().setHorizontalRule().run()
  },
  {
    id: "recording",
    category: "Insert",
    keywords: ["audio", "record", "microphone", "voice"],
    label: "Recording",
    hint: "Record audio from your microphone",
    isActive: () => false,
    run: (editor) => editor.chain().focus().insertContent({ type: "recording" }).run()
  },
  {
    id: "image",
    category: "Insert",
    keywords: ["picture", "photo", "screenshot"],
    label: "Image",
    hint: "Upload a picture",
    isActive: () => false,
    run: (editor) => {
      void pickImage().then((src) => {
        if (src) editor.chain().focus().setImage({ src }).run();
      });
    }
  },
  {
    id: "video",
    category: "Insert",
    keywords: ["youtube", "vimeo", "embed", "movie", "clip"],
    label: "Video",
    hint: "YouTube or Vimeo link, or a video file",
    isActive: () => false,
    run: (editor) => editor.chain().focus().insertContent({ type: "video" }).run()
  },
  {
    id: "attachment",
    category: "Insert",
    keywords: ["file", "attach", "upload", "pdf", "document", "slides"],
    label: "File",
    hint: "Attach a PDF, slides or any file",
    isActive: () => false,
    run: (editor) => editor.chain().focus().insertContent({ type: "attachment" }).run()
  },
  {
    id: "aiBlock",
    category: "AI",
    keywords: ["ai", "prompt", "generate", "write"],
    label: "AI block",
    hint: "A prompt whose answer stays on the page",
    isActive: () => false,
    run: (editor) => editor.chain().focus().insertContent({ type: "aiBlock" }).run()
  }
];
