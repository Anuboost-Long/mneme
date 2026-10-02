import { errorMessage } from "../../../shared/lib/errorMessage";
import type { ChatAttachment } from "./attachments";
import { getConnections } from "./connection/actions";
import { getConversation } from "./conversation/actions";
import { appendMessage, getMessages } from "./message/actions";
import type { AgentMessage } from "./message/types";
import { runTurn, type ToolActivity } from "./runTurn";

export type Turn = {
  busy: boolean;
  stopping: boolean;
  message: string;
  attachments: ChatAttachment[];
  text: string;
  tools: ToolActivity[];
  messages: AgentMessage[] | null;
  error: string;
};

let turns = new Map<number, Turn>();
const listeners = new Set<() => void>();
const handles = new Map<number, { kill: () => Promise<void> }>();

export const getTurns = () => turns;
export function subscribeTurns(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function update(id: number, patch: Partial<Turn>) {
  const turn = turns.get(id);
  if (!turn) return;
  turns = new Map(turns).set(id, { ...turn, ...patch });
  listeners.forEach((listener) => listener());
}

export function forgetTurn(id: number) {
  if (turns.get(id)?.busy) throw new Error("Stop generating before deleting this conversation.");
  turns = new Map(turns);
  turns.delete(id);
  listeners.forEach((listener) => listener());
}

export async function stopTurn(id: number) {
  if (!turns.get(id)?.busy) return;
  update(id, { stopping: true, error: "" });
  try {
    await handles.get(id)?.kill();
  } catch (error) {
    update(id, {
      stopping: false,
      error: errorMessage(error, "Couldn’t stop generating. Try again.")
    });
  }
}

export async function startTurn(
  id: number,
  message: string,
  attachments: ChatAttachment[] = [],
  context?: string
) {
  if (!message.trim() || turns.get(id)?.busy) return;
  turns = new Map(turns).set(id, {
    busy: true,
    stopping: false,
    message,
    attachments,
    text: "",
    tools: [],
    messages: null,
    error: ""
  });
  listeners.forEach((listener) => listener());

  async function finish(error = "") {
    handles.delete(id);
    try {
      update(id, { messages: await getMessages(id), busy: false, stopping: false, error });
    } catch {
      update(id, {
        busy: false,
        stopping: false,
        error: error || "Couldn’t reload the saved messages. Reopen this conversation to try again."
      });
    }
  }

  try {
    const conversation = await getConversation(id);
    const connection = (await getConnections()).find(
      (item) => item.id === conversation?.agent_connection_id
    );
    if (!conversation || !connection)
      throw new Error("This conversation’s agent connection no longer exists.");
    update(id, { messages: await getMessages(id) });
    if (turns.get(id)?.stopping) {
      await finish();
      return;
    }
    let ended = false;
    const handle = await runTurn(
      connection,
      id,
      conversation.external_session_id,
      message,
      attachments,
      context,
      (event) => {
        switch (event.type) {
          case "text":
            update(id, { text: (turns.get(id)?.text ?? "") + event.text });
            break;
          case "tool": {
            const tools = turns.get(id)?.tools ?? [];
            update(id, {
              tools: tools.some((tool) => tool.id === event.tool.id)
                ? tools.map((tool) => (tool.id === event.tool.id ? event.tool : tool))
                : [...tools, event.tool]
            });
            break;
          }
          case "done":
            ended = true;
            update(id, { text: event.text });
            void finish();
            break;
          case "error":
            ended = true;
            void finish(event.message);
            break;
        }
      }
    );
    if (!ended) {
      handles.set(id, handle);
      if (turns.get(id)?.stopping) await stopTurn(id);
    }
  } catch (error) {
    const text = errorMessage(error, "Couldn’t start this agent. Check its command and try again.");
    try {
      await appendMessage(id, "error", text);
    } catch {
      /* Keep the error visible even when storage is unavailable. */
    }
    await finish(text);
  }
}
