import { useAgentChat } from "@/features/agent-chat/lib/useAgentChat";
import AgentChatPage from "@/features/agent-chat/pages/AgentChatPage";
import { useSearchParams } from "react-router-dom";

export default function AgentChatRoute() {
  const [params, setParams] = useSearchParams();
  const id = Number(params.get("conversation"));
  const selectedId = Number.isSafeInteger(id) && id > 0 ? id : null;
  const chat = useAgentChat(selectedId);
  return (
    <AgentChatPage
      chat={chat}
      selectedId={selectedId}
      onSelect={(value) => setParams(value === null ? {} : { conversation: String(value) })}
    />
  );
}
