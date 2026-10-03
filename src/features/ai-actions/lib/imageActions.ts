import type { ImageAiAction } from "../../courses/components/editor/AlignableImage";
import { ActionOutput, ActionScope, type AiAction } from "./action/types";

const builtIn = {
  icon: null,
  scope: ActionScope.Page,
  output: ActionOutput.Preview,
  pageTypes: null,
  packId: null,
  enabled: true,
  position: 0,
  created_at: "",
  updated_at: ""
};

export const imageActions: Record<ImageAiAction, AiAction> = {
  explain: {
    ...builtIn,
    id: -1,
    name: "Explain image",
    prompt:
      "Explain this picture to a student studying it: what it shows, what each important part means, and the main idea to take away. Keep its own terms and labels."
  },
  summarize: {
    ...builtIn,
    id: -2,
    name: "Summarize image",
    prompt:
      "Summarize this picture in a few short bullet points: its main idea first, then the details worth remembering."
  }
};
