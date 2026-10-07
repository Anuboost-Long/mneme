import { setDefaultConnectionId } from "@/features/agent-chat/lib/connection/actions";
import { useAgentChoice } from "@/features/agent-chat/lib/useAgentChoice";
import { errorMessage } from "@/shared/lib/errorMessage";
import { BodyText, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useState } from "react";

import AgentSelect from "./AgentSelect";

export default function DefaultAgentSettings() {
  const agent = useAgentChoice();
  const [error, setError] = useState("");

  const choice = {
    ...agent,
    setConnectionId: (id: number) => {
      agent.setConnectionId(id);
      setError("");
      setDefaultConnectionId(id).catch((error_) =>
        setError(errorMessage(error_, "Couldn’t save the default agent. Try again."))
      );
    }
  };

  return (
    <section
      aria-labelledby="default-agent-title"
      className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}
    >
      <div>
        <SectionTitle id="default-agent-title">Default agent</SectionTitle>
        <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>
          The agent every AI task starts with. You can pick another one each time you prepare a
          module, write a quiz or run an action.
        </BodyText>
      </div>
      <div className={clsx("min-w-0 w-full max-w-xs @min-3xl:col-span-2")}>
        <AgentSelect choice={choice} />
        {error && (
          <BodyText role="alert" tone="error" className={clsx("mt-3")}>
            {error}
          </BodyText>
        )}
      </div>
    </section>
  );
}
