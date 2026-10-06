import type { ImageData } from "../../../shared/lib/htmlImages";
import type { AgentConnection } from "../../agent-chat/lib/connection/types";
import {
  acceptsImages,
  acceptsStdin,
  MAX_ARGV_CONTEXT_CHARS,
  runOnce,
  type TurnEvent
} from "../../agent-chat/lib/runTurn";
import type { AiProfile } from "../../ai-profiles/lib/profile/types";
import type { AiAction } from "./action/types";

// What a run actually received: "selection"/"page" for a page-scoped
// action (whichever applied when it started), or the action's own
// module/course scope.
export type RunScope = "selection" | "image" | "page" | "module" | "course";

const subjects: Record<RunScope, string> = {
  selection: "the selected text",
  image: "the picture marked [Image 1] (the HTML around it is only its place on the page)",
  page: "the page",
  module: "every page in this module, each in its own <page> element",
  course: "every page in this course, each in its own <page> element tagged with its module"
};

const tooLong: Record<RunScope, string> = {
  selection:
    "The selection is too long for this agent. Select less, or choose Claude or Codex under Run with.",
  image: "This picture is too large for this agent. Choose Claude or Codex under Run with.",
  page: "This page is too long for this agent. Select part of it, or choose Claude or Codex under Run with.",
  module: "This module is too long for this agent. Choose Claude or Codex under Run with.",
  course: "This course is too long for this agent. Choose Claude or Codex under Run with."
};

// Only Claude and Codex read this (see runTurn.ts's invokers); it keeps
// them from treating mneme's own working directory as a coding task, the
// same problem runTurn's framingInstructions solves for chat.
const framing =
  "You are running a one-off action inside mneme, a study notes app, on content from the user's own pages. This is not a software task: do not read, search, or change any files on this machine, and do not use any tools.";

// What the agent is told about the pictures it gets (or can't get).
function imageNote(count: number, attached: boolean) {
  if (count === 0) return "";
  if (!attached)
    return "\n\nThe content marks where pictures were as [Image N], but this agent can’t receive them: work from the text alone and say so if a picture mattered.";
  const pictures = count === 1 ? "picture is" : `${count} pictures are`;
  return `\n\nThe ${pictures} attached as images, in the order of the content's [Image N] markers. Use what they show.`;
}

export async function runAction(
  connection: AgentConnection,
  action: Pick<AiAction, "prompt">,
  scope: RunScope,
  content: { html: string; images: ImageData[] },
  context: string,
  profile: AiProfile | null,
  onEvent: (event: TurnEvent) => void
) {
  const attached = acceptsImages(connection);
  const viaStdin = acceptsStdin(connection);
  const payload = [context, `<content>\n${content.html}\n</content>`].filter(Boolean).join("\n\n");
  if (!viaStdin && payload.length > MAX_ARGV_CONTEXT_CHARS) throw new Error(tooLong[scope]);
  const where = viaStdin ? "on stdin" : "below";
  const background = context
    ? " The <context> element ahead of it says where the content comes from (course, module, page, attachments, transcripts): use it to understand the content, but work on the content."
    : "";
  const task = `${action.prompt}\n\nWork on ${subjects[scope]}, given as HTML in the <content> element ${where}.${background} Reply with only the result, in plain Markdown: no HTML tags (don’t copy the input’s tags), no preamble, no follow-up questions.${imageNote(content.images.length, attached)}`;
  const sent = attached ? content.images : [];
  if (viaStdin) return runOnce(connection, task, framing, profile, onEvent, payload, sent);
  return runOnce(connection, `${task}\n\n${payload}`, framing, profile, onEvent, undefined, sent);
}
