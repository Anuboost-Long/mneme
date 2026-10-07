import { useEffect, useState } from "react";

import { getConnections, getDefaultConnectionId } from "./connection/actions";
import type { AgentConnection } from "./connection/types";

export type AgentChoice = {
  connections: AgentConnection[] | null;
  connectionId: number | null;
  setConnectionId: (id: number) => void;
};

export function useAgentChoice(open = true): AgentChoice {
  const [connections, setConnections] = useState<AgentConnection[] | null>(null);
  const [connectionId, setConnectionId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let current = true;
    Promise.all([getConnections(), getDefaultConnectionId()])
      .then(([loaded, defaultId]) => {
        if (!current) return;
        setConnections(loaded);
        setConnectionId(
          loaded.some((connection) => connection.id === defaultId)
            ? defaultId
            : (loaded[0]?.id ?? null)
        );
      })
      .catch(() => {
        if (current) setConnections([]);
      });
    return () => {
      current = false;
    };
  }, [open]);

  return { connections, connectionId, setConnectionId };
}
