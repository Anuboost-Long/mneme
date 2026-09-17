import type { Editor } from "@tiptap/react";

export type MarkCommand = {
  id: string;
  label: string;
  hint: string;
  className?: string;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

export const markCommands: MarkCommand[] = [
  { id: "bold", label: "B", hint: "Bold", className: "font-bold", isActive: (editor) => editor.isActive("bold"), run: (editor) => editor.chain().focus().toggleBold().run() },
  { id: "italic", label: "I", hint: "Italic", className: "italic", isActive: (editor) => editor.isActive("italic"), run: (editor) => editor.chain().focus().toggleItalic().run() },
  { id: "underline", label: "U", hint: "Underline", className: "underline", isActive: (editor) => editor.isActive("underline"), run: (editor) => editor.chain().focus().toggleUnderline().run() },
  { id: "clearFormatting", label: "Tx", hint: "Clear formatting", isActive: () => false, run: (editor) => editor.chain().focus().unsetAllMarks().run() },
  { id: "strike", label: "S", hint: "Strikethrough", className: "line-through", isActive: (editor) => editor.isActive("strike"), run: (editor) => editor.chain().focus().toggleStrike().run() },
  { id: "code", label: "</>", hint: "Inline code", className: "font-mono", isActive: (editor) => editor.isActive("code"), run: (editor) => editor.chain().focus().toggleCode().run() },
];
