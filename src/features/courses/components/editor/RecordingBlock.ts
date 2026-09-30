import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import RecordingNodeView from "./RecordingNodeView";

// The page's content keeps only the recording's id; the audio file, name
// and duration live in the `recording` table. A block with no id yet is
// the recorder itself.
const RecordingBlock = Node.create<{ pageId: number }>({
  name: "recording",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return { pageId: 0 };
  },

  addAttributes() {
    return {
      recordingId: {
        default: null,
        parseHTML: (element) => Number(element.dataset.recordingId) || null,
        renderHTML: (attributes) => ({ "data-recording-id": attributes.recordingId ?? "" })
      },
      // Set by the "Start recording" command so the recorder starts right
      // away; never written to the page's HTML.
      startOnInsert: { default: false, parseHTML: () => false, renderHTML: () => ({}) }
    };
  },

  parseHTML() {
    return [{ tag: "div[data-recording-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes];
  },

  addNodeView() {
    return ReactNodeViewRenderer(RecordingNodeView);
  }
});

export default RecordingBlock;
