import { useEffect, useState, useSyncExternalStore } from "react";

import type { ChatAttachment } from "./attachments";
import { isModelCommand, parseCommand, supportsModelCommand } from "./commands";
import { getConnections, updateConnectionModel } from "./connection/actions";
import type { AgentConnection } from "./connection/types";
import {
  createConversation,
  deleteConversation,
  getConversations,
  renameConversation
} from "./conversation/actions";
import type { Conversation } from "./conversation/types";
import { getMessages } from "./message/actions";
import type { AgentMessage } from "./message/types";
import { forgetTurn, getTurns, startTurn, stopTurn, subscribeTurns } from "./turns";

export function useAgentChat(selectedId: number | null) {
  const turns = useSyncExternalStore(subscribeTurns, getTurns);
  const turn = selectedId === null ? undefined : turns.get(selectedId);
  const [connections, setConnections] = useState<AgentConnection[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [transcript, setTranscript] = useState<{
    id: number | null;
    messages: AgentMessage[];
    error: string;
  }>({ id: null, messages: [], error: "" });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setNotice("");
  }, [selectedId]);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setError("");
    Promise.all([getConnections(), getConversations()])
      .then(([agents, chats]) => {
        if (!active) return;
        setConnections(agents);
        setConversations(chats);
        setLoaded(true);
      })
      .catch(() => {
        if (active) setError("Couldn’t load conversations. Try again.");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    let active = true;
    if (selectedId === null) return;
    setTranscript({ id: null, messages: [], error: "" });
    getMessages(selectedId)
      .then((messages) => {
        if (active) setTranscript({ id: selectedId, messages, error: "" });
      })
      .catch(() => {
        if (active)
          setTranscript({
            id: selectedId,
            messages: [],
            error: "Couldn’t load messages. Try again."
          });
      });
    return () => {
      active = false;
    };
  }, [selectedId, attempt]);

  useEffect(() => {
    if (!turn || turn.busy) return;
    let active = true;
    getConversations()
      .then((items) => {
        if (active) setConversations(items);
      })
      .catch(() => {
        if (active) setError("Couldn’t refresh conversations. Try again.");
      });
    return () => {
      active = false;
    };
  }, [turn?.busy, selectedId]);

  async function create(connectionId: number) {
    setConnections(await getConnections());
    const conversation = await createConversation(connectionId);
    setConversations((current) => [conversation, ...current]);
    return conversation.id;
  }

  async function rename(id: number, title: string) {
    await renameConversation(id, title);
    setConversations(await getConversations());
  }

  async function setModel(connectionId: number, model: string | null) {
    await updateConnectionModel(connectionId, model);
    setConnections(await getConnections());
  }

  // Intercepts a composer message that's a recognized slash command before
  // it would otherwise be sent to the agent — returns false for anything
  // else, so the caller falls back to sending it as a normal message.
  async function runCommand(connection: AgentConnection, message: string): Promise<boolean> {
    const command = parseCommand(message);
    if (!command || !isModelCommand(command.name) || !supportsModelCommand(connection))
      return false;
    await setModel(connection.id, command.args || null);
    setNotice(
      command.args ? `Model set to ${command.args}.` : "Model reset to this agent's default."
    );
    return true;
  }

  async function remove(id: number) {
    if (turns.get(id)?.busy) throw new Error("Stop generating before deleting this conversation.");
    await deleteConversation(id);
    forgetTurn(id);
    setConversations((current) => current.filter((conversation) => conversation.id !== id));
  }

  return {
    connections,
    conversations,
    loaded,
    error,
    create,
    rename,
    remove,
    runCommand,
    notice,
    turn,
    isBusy: (id: number) => turns.get(id)?.busy ?? false,
    send: (message: string, attachments: ChatAttachment[], context?: string) => {
      setNotice("");
      return selectedId === null
        ? Promise.resolve()
        : startTurn(selectedId, message, attachments, context);
    },
    stop: () => (selectedId === null ? Promise.resolve() : stopTurn(selectedId)),
    messages: turn?.messages ?? (transcript.id === selectedId ? transcript.messages : []),
    messagesLoaded:
      (turn?.messages !== null && turn?.messages !== undefined) || transcript.id === selectedId,
    messageError: transcript.id === selectedId ? transcript.error : "",
    retry: () => {
      if (selectedId !== null && !turn?.busy) forgetTurn(selectedId);
      setAttempt((value) => value + 1);
    }
  };
}
