import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import AiBlockNodeView from "./AiBlockNodeView";

// A prompt kept on the page, with what the agent wrote for it inside the
// block, so it can be generated again when the page changes. Its location
// picks the AI profile and the context the run gets.
export type AiBlockLocation = { courseId: number; moduleId: number; pageId: number };

const AiBlock = Node.create<AiBlockLocation>({
  name: "aiBlock",
  group: "block",
  content: "block*",
  defining: true,
  draggable: true,

  addOptions() {
    return { courseId: 0, moduleId: 0, pageId: 0 };
  },

  addAttributes() {
    return {
      prompt: {
        default: "",
        parseHTML: (element) => element.dataset.prompt ?? "",
        renderHTML: (attributes) => ({ "data-prompt": attributes.prompt })
      }
    };
  },

  parseHTML() {
    return [{ tag: "div[data-ai-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { "data-ai-block": "", ...HTMLAttributes }, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AiBlockNodeView);
  }
});

export default AiBlock;
