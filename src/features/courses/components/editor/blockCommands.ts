import type { Editor } from "@tiptap/react";
import { pickImage } from "../../lib/page-image";

export type BlockCommand = {
  id: string;
  label: string;
  hint: string;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

export const blockCommands: BlockCommand[] = [
  { id: "paragraph", label: "Text", hint: "Plain paragraph", isActive: (editor) => editor.isActive("paragraph") && !editor.isActive("bulletList") && !editor.isActive("orderedList") && !editor.isActive("taskList"), run: (editor) => editor.chain().focus().setParagraph().run() },
  { id: "heading1", label: "Heading 1", hint: "Large section heading", isActive: (editor) => editor.isActive("heading", { level: 1 }), run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
  { id: "heading2", label: "Heading 2", hint: "Medium section heading", isActive: (editor) => editor.isActive("heading", { level: 2 }), run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: "heading3", label: "Heading 3", hint: "Small section heading", isActive: (editor) => editor.isActive("heading", { level: 3 }), run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  { id: "bulletList", label: "Bulleted list", hint: "Simple bulleted list", isActive: (editor) => editor.isActive("bulletList"), run: (editor) => editor.chain().focus().toggleBulletList().run() },
  { id: "orderedList", label: "Numbered list", hint: "List with numbering", isActive: (editor) => editor.isActive("orderedList"), run: (editor) => editor.chain().focus().toggleOrderedList().run() },
  { id: "taskList", label: "Checklist", hint: "To-do list with checkboxes", isActive: (editor) => editor.isActive("taskList"), run: (editor) => editor.chain().focus().toggleTaskList().run() },
  { id: "blockquote", label: "Quote", hint: "Capture a quote", isActive: (editor) => editor.isActive("blockquote"), run: (editor) => editor.chain().focus().toggleBlockquote().run() },
  { id: "codeBlock", label: "Code block", hint: "Multi-line code snippet", isActive: (editor) => editor.isActive("codeBlock"), run: (editor) => editor.chain().focus().toggleCodeBlock().run() },
  { id: "table", label: "Table", hint: "Insert a 3x3 table", isActive: () => false, run: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { id: "horizontalRule", label: "Divider", hint: "Visual section break", isActive: () => false, run: (editor) => editor.chain().focus().setHorizontalRule().run() },
  {
    id: "image",
    label: "Image",
    hint: "Upload a picture",
    isActive: () => false,
    run: (editor) => {
      void pickImage().then((src) => {
        if (src) editor.chain().focus().setImage({ src }).run();
      });
    },
  },
];
