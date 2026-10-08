import ReadAloudBar from "@/features/read-aloud/components/ReadAloudBar";
import { elementChunks } from "@/features/read-aloud/lib/readableText";
import type { ReadAloud } from "@/features/read-aloud/lib/useReadAloud";
import Dialog from "@/shared/ui/Dialog";
import clsx from "clsx";
import { useEffect, useRef, type RefObject } from "react";

export default function ReadAlongDialog({
  open,
  title,
  html,
  text,
  reader,
  origin,
  onClose
}: Readonly<{
  open: boolean;
  title: string;
  html?: string | null;
  text?: string | null;
  reader: ReadAloud;
  origin?: RefObject<HTMLElement | null>;
  onClose: () => void;
}>) {
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !body.current) return;
    const source = new DOMParser().parseFromString(html ?? "", "text/html").body;
    if (!html) for (const line of (text ?? "").split(/\n+/)) source.append(Object.assign(document.createElement("p"), { textContent: line }));
    body.current.replaceChildren(...source.childNodes);
    reader.read([{ text: title }, ...elementChunks(body.current)]);
  }, [open]);

  function close() {
    reader.stop();
    onClose();
  }

  return (
    <Dialog open={open} title={title} wide origin={origin} onClose={close}>
      {() =>
        open && (
          <>
            <div ref={body} tabIndex={-1} data-autofocus className={clsx("page-editor-content pb-6 focus:outline-none")} />
            <ReadAloudBar reader={reader} docked />
          </>
        )
      }
    </Dialog>
  );
}
