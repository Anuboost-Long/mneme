import type { AttachmentInfo } from "../attachments";
import { insertMessage } from "./table";
import type { AgentMessage } from "./types";

export { getMessages } from "./table";

export async function appendMessage(
  conversationId: number,
  role: AgentMessage["role"],
  content: string,
  attachments: AttachmentInfo[] = []
) {
  const attachmentsJson = attachments.length
    ? JSON.stringify(
        attachments.map(({ name, size, kind, count, preview, truncated, reference }) => ({
          name,
          size,
          kind,
          count,
          preview,
          truncated,
          reference
        }))
      )
    : null;
  await insertMessage({
    conversation_id: conversationId,
    role,
    content,
    attachments: attachmentsJson
  });
}
