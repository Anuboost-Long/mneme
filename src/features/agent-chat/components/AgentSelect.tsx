import type { AgentChoice } from "@/features/agent-chat/lib/useAgentChoice";
import Select from "@/shared/ui/Select";
import { BodyText } from "@/shared/ui/Typography";
import clsx from "clsx";
import { Link } from "react-router-dom";

export default function AgentSelect({
  choice,
  label = "Agent",
  disabled,
  compact = false,
  className
}: Readonly<{
  choice: AgentChoice;
  label?: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}>) {
  const { connections, connectionId, setConnectionId } = choice;
  if (compact && connectionId === null) return null;
  if (connections === null)
    return (
      <BodyText role="status" tone="muted" className={className}>
        Loading agents…
      </BodyText>
    );
  if (connectionId === null)
    return (
      <BodyText tone="muted" className={className}>
        No agent connected yet.{" "}
        <Link to="/agent-chat" className={clsx("text-ink underline underline-offset-4")}>
          Add one in Agent chat
        </Link>
        .
      </BodyText>
    );
  return (
    <Select
      label={label}
      value={connectionId}
      onChange={setConnectionId}
      disabled={disabled}
      compact={compact}
      hideLabel={compact}
      className={className}
      options={connections.map((connection) => ({ value: connection.id, label: connection.name }))}
    />
  );
}
