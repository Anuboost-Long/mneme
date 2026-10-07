import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import CalloutNodeView from "./CalloutNodeView";

export const calloutTones = ["note", "tip", "warning"] as const;

export type CalloutTone = (typeof calloutTones)[number];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      toggleCallout: () => ReturnType;
    };
  }
}

const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      tone: {
        default: "note",
        parseHTML: (element) => {
          const tone = element.dataset.callout as CalloutTone;
          return calloutTones.includes(tone) ? tone : "note";
        },
        renderHTML: (attributes) => ({ "data-callout": attributes.tone })
      }
    };
  },

  parseHTML() {
    return [{ tag: "aside[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["aside", HTMLAttributes, 0];
  },

  addCommands() {
    return {
      toggleCallout:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name)
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  }
});

export default Callout;
