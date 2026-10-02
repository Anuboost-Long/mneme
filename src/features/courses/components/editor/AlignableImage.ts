import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ImageNodeView from "./ImageNodeView";

export type ImageAlign = "left" | "center" | "right";

export type ImageAiAction = "explain" | "summarize";

declare module "@tiptap/core" {
  interface Storage {
    image: { runAiAction: ((kind: ImageAiAction) => Promise<string | null>) | null };
  }
}

const AlignableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (element) => element.dataset.align || "center",
        renderHTML: (attributes) => ({ "data-align": attributes.align }),
      },
      caption: {
        default: null,
        parseHTML: (element) => element.dataset.caption || null,
        renderHTML: (attributes) => (attributes.caption ? { "data-caption": attributes.caption } : {}),
      },
    };
  },
  addStorage() {
    return { runAiAction: null };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

export default AlignableImage;
