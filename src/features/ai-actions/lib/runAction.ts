import type { AgentConnection } from "../../agent-chat/lib/connections";
import { acceptsImages, acceptsStdin, MAX_ARGV_CONTEXT_CHARS, runOnce, type TurnEvent } from "../../agent-chat/lib/runTurn";
import { extractImages } from "../../../shared/lib/htmlImages";
import type { AiProfile } from "../../ai-profiles/lib/profiles";
import type { AiAction } from "./actions";

// What a run actually received: "selection"/"page" for a page-scoped
// action (whichever applied when it started), or the action's own
// module/course scope.
export type RunScope = "selection" | "page" | "module" | "course";

const subjects: Record<RunScope, string> = {
  selection: "the selected text",
  page: "the page",
  module: "every page in this module, each in its own <page> element",
  course: "every page in this course, each in its own <page> element tagged with its module",
};

const tooLong: Record<RunScope, string> = {
  selection: "The selection is too long for this agent. Select less, or choose Claude or Codex under Run with.",
  page: "This page is too long for this agent. Select part of it, or choose Claude or Codex under Run with.",
  module: "This module is too long for this agent. Choose Claude or Codex under Run with.",
  course: "This course is too long for this agent. Choose Claude or Codex under Run with.",
};

// Only Claude and Codex read this (see runTurn.ts's invokers); it keeps
// them from treating mneme's own working directory as a coding task, the
// same problem runTurn's framingInstructions solves for chat.
const framing = "You are running a one-off action inside mneme, a study notes app, on content from the user's own pages. This is not a software task: do not read, search, or change any files on this machine, and do not use any tools.";

// What the agent is told about the pictures it gets (or can't get).
function imageNote(count: number, attached: boolean) {
  if (count === 0) return "";
  if (!attached) return "\n\nThe content marks where pictures were as [Image N], but this agent can’t receive them: work from the text alone and say so if a picture mattered.";
  const pictures = count === 1 ? "picture is" : `${count} pictures are`;
  return `\n\nThe ${pictures} attached as images, in the order of the content's [Image N] markers. Use what they show.`;
}

export async function runAction(
  connection: AgentConnection,
  action: Pick<AiAction, "prompt">,
  scope: RunScope,
  contentHtml: string,
  profile: AiProfile | null,
  onEvent: (event: TurnEvent) => void,
) {
  const { html, images } = await extractImages(contentHtml);
  const attached = acceptsImages(connection);
  const viaStdin = acceptsStdin(connection);
  if (!viaStdin && html.length > MAX_ARGV_CONTEXT_CHARS) throw new Error(tooLong[scope]);
  const where = viaStdin ? "provided on stdin" : "below";
  const task = `${action.prompt}\n\nWork on ${subjects[scope]}, given as HTML ${where}. Reply with only the result, in plain Markdown: no HTML tags (don’t copy the input’s tags), no preamble, no follow-up questions.${imageNote(images.length, attached)}`;
  const sent = attached ? images : [];
  if (viaStdin) return runOnce(connection, task, framing, profile, onEvent, html, sent);
  return runOnce(connection, `${task}\n\n<content>\n${html}\n</content>`, framing, profile, onEvent, undefined, sent);
}
