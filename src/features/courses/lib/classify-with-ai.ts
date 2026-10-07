import { runOnce } from "@/features/agent-chat/lib/runTurn";
import { getAgentConnection } from "@/features/agent-chat/lib/connection/actions";

import { CONTENT_KINDS, pageOutline, type ContentKind } from "./content-detection";

const framing =
  "You are classifying a course page inside mneme, a study notes app. This is not a software task: do not read, search, or change any files on this machine, and do not use any tools.";

function kindIn(answer: string): ContentKind | undefined {
  const words = answer.toLowerCase().match(/[a-z]+/g) ?? [];
  return words.map((word) => CONTENT_KINDS.find((kind) => kind === word)).find(Boolean);
}

export async function classifyWithAi(title: string, html: string): Promise<ContentKind> {
  const connection = await getAgentConnection();
  if (!connection)
    throw new Error("No agent connected yet. Add one in Agent chat, then try again.");
  const question = `What kind of course page is this? Reply with exactly one word from: ${CONTENT_KINDS.join(", ")}.\n\n${pageOutline(title, html)}`;
  return new Promise((resolve, reject) => {
    runOnce(connection, question, framing, null, (event) => {
      if (event.type === "error") reject(new Error(event.message));
      if (event.type !== "done") return;
      const kind = kindIn(event.text);
      if (kind) resolve(kind);
      else
        reject(new Error(`${connection.name} didn’t name a page type. Choose the type yourself.`));
    }).catch(() =>
      reject(new Error(`Couldn’t start ${connection.name}. Check it’s installed and try again.`))
    );
  });
}
