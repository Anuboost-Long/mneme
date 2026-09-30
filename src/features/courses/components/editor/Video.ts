import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import VideoNodeView from "./VideoNodeView";

// Either a YouTube/Vimeo player (`embed`, its player URL) or a video file
// stored through desktop.files (`file`, its reference). With neither, the
// block asks for one.
const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      embed: {
        default: null,
        parseHTML: (element) => element.dataset.embed || null,
        renderHTML: (attributes) => (attributes.embed ? { "data-embed": attributes.embed } : {})
      },
      file: {
        default: null,
        parseHTML: (element) => element.dataset.file || null,
        renderHTML: (attributes) => (attributes.file ? { "data-file": attributes.file } : {})
      }
    };
  },

  parseHTML() {
    return [{ tag: "div[data-video]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { "data-video": "", ...HTMLAttributes }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView);
  }
});

export default Video;
