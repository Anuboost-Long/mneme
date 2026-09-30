import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import AttachmentNodeView from "./AttachmentNodeView";

// Like the recording block, the page keeps only the id; the file and its
// name live in the `attachment` table. A block with no id yet asks for a
// file, stored against `pageId`.
const AttachmentBlock = Node.create<{ pageId: number }>({
  name: "attachment",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return { pageId: 0 };
  },

  addAttributes() {
    return {
      attachmentId: {
        default: null,
        parseHTML: (element) => Number(element.dataset.attachmentId) || null,
        renderHTML: (attributes) => ({ "data-attachment-id": attributes.attachmentId ?? "" })
      }
    };
  },

  parseHTML() {
    return [{ tag: "div[data-attachment-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentNodeView);
  }
});

export default AttachmentBlock;
