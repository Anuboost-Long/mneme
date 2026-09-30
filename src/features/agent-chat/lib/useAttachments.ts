import { useEffect, useRef, useState, type DragEvent } from "react";
import { readAttachment, type ChatAttachment } from "./attachments";
import { errorMessage } from "../../../shared/lib/errorMessage";
import { pickFiles } from "../../../shared/lib/pickFiles";

// The files waiting to go out with the next message. Owned by the page, not
// the composer, because files can be dropped anywhere on the conversation.
export function useAttachments(conversationId: number | null) {
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [reading, setReading] = useState<string[]>([]);
  const [error, setError] = useState("");
  const generation = useRef(0);

  useEffect(() => {
    generation.current += 1;
    setAttachments([]);
    setReading([]);
    setError("");
  }, [conversationId]);

  async function add(files: File[]) {
    if (!files.length) return;
    const started = generation.current;
    const names = files.map((file) => file.name);
    setReading((current) => [...current, ...names]);
    const results = await Promise.allSettled(files.map(readAttachment));
    // Switched conversations while reading: these files belong to the old one.
    if (generation.current !== started) return;
    setReading((current) => current.filter((name) => !names.includes(name)));
    const added = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const failed = results.find((result) => result.status === "rejected");
    setAttachments((current) => [...current, ...added.filter((file) => !current.some((item) => item.name === file.name))]);
    setError(failed ? errorMessage(failed.reason, "Couldn’t read that file. Try again.") : "");
  }

  async function pick() {
    try {
      await add(await pickFiles({ multiple: true }));
    } catch (pickError) {
      setError(errorMessage(pickError, "Couldn’t open the file picker. Try again."));
    }
  }

  return {
    attachments, reading, error, add, pick,
    remove: (name: string) => setAttachments((current) => current.filter((item) => item.name !== name)),
    clear: () => { setAttachments([]); setError(""); },
  };
}

export type Attachments = ReturnType<typeof useAttachments>;

const carriesFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

// Whether files are being dragged over an element. Enter/leave fire again
// for every child the pointer crosses, so a depth count, not a boolean,
// decides when the drag has really left.
export function useFileDrop(enabled: boolean, onDrop: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    if (enabled) return;
    depth.current = 0;
    setDragging(false);
  }, [enabled]);

  return {
    dragging,
    handlers: {
      onDragEnter(event: DragEvent) {
        if (!enabled || !carriesFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      },
      onDragOver(event: DragEvent) {
        if (!enabled || !carriesFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      },
      onDragLeave(event: DragEvent) {
        if (!enabled || !carriesFiles(event)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDragging(false);
      },
      onDrop(event: DragEvent) {
        if (!enabled || !carriesFiles(event)) return;
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        onDrop(Array.from(event.dataTransfer.files));
      },
    },
  };
}
