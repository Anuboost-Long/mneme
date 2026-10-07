import { Extension } from "@tiptap/core";
import type { CommandProps, Editor } from "@tiptap/core";

const INDENTABLE = ["paragraph", "heading"];
const MAX_INDENT = 8;
const INDENT_EM = 2;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockIndent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

// Lists, tables and code blocks own their Tab keys (sink/lift list item,
// move between cells, insert spaces); this only indents the plain blocks
// they leave alone, and still swallows Tab inside them so focus never
// jumps out of the editor.
function isInsideOwnTabHandler(editor: Editor) {
  return (
    editor.isActive("listItem") ||
    editor.isActive("taskItem") ||
    editor.isActive("table") ||
    editor.isActive("codeBlock")
  );
}

function shiftIndent(delta: number) {
  return ({ tr, state, dispatch }: CommandProps) => {
    let changed = false;
    state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
      if (!INDENTABLE.includes(node.type.name)) return;
      const indent = Math.max(0, Math.min(MAX_INDENT, (node.attrs.indent ?? 0) + delta));
      if (indent === node.attrs.indent) return false;
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent });
      changed = true;
      return false;
    });
    if (changed && dispatch) tr.scrollIntoView();
    return changed;
  };
}

const BlockIndent = Extension.create({
  name: "blockIndent",
  priority: 50,

  addGlobalAttributes() {
    return [
      {
        types: INDENTABLE,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => Math.min(MAX_INDENT, Number(element.dataset.indent) || 0),
            renderHTML: (attributes) =>
              attributes.indent
                ? {
                    "data-indent": attributes.indent,
                    style: `margin-left: ${attributes.indent * INDENT_EM}em`
                  }
                : {}
          }
        }
      }
    ];
  },

  addCommands() {
    return { indent: () => shiftIndent(1), outdent: () => shiftIndent(-1) };
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (!isInsideOwnTabHandler(editor)) editor.commands.indent();
        return true;
      },
      "Shift-Tab": ({ editor }) => {
        if (!isInsideOwnTabHandler(editor)) editor.commands.outdent();
        return true;
      },
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        if (!selection.empty || selection.$from.parentOffset !== 0) return false;
        if (!INDENTABLE.includes(selection.$from.parent.type.name)) return false;
        return editor.commands.outdent();
      }
    };
  }
});

export default BlockIndent;
