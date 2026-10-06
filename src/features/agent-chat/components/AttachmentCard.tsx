import {
  describeAttachment,
  fileExtension,
  imageMediaType,
  type AttachmentInfo,
  type ChatAttachment
} from "@/features/agent-chat/lib/attachments";
import { useOpenedOnce } from "@/shared/lib/dialogState";
import Dialog from "@/shared/ui/Dialog";
import { BodyText, Caption } from "@/shared/ui/Typography";
import { desktop } from "@chain/sdk";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

type CardFile = AttachmentInfo & Pick<ChatAttachment, "bytes">;

// An image not yet sent is still in memory; a sent one has a desktop.files
// copy. undefined while loading, null when the copy is gone.
function useImageSrc(file: CardFile): string | null | undefined {
  const [src, setSrc] = useState<string | null>();
  useEffect(() => {
    if (file.kind !== "image") return;
    if (file.bytes) {
      const url = URL.createObjectURL(new Blob([file.bytes], { type: imageMediaType(file.name) }));
      setSrc(url);
      return () => URL.revokeObjectURL(url);
    }
    if (!file.reference) return;
    let active = true;
    desktop.files
      .url(file.reference)
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setSrc(null);
      });
    return () => {
      active = false;
    };
  }, [file.kind, file.name, file.bytes, file.reference]);
  return src;
}

export default function AttachmentCard({
  file,
  onRemove
}: Readonly<{ file: CardFile; onRemove?: () => void }>) {
  const [previewing, setPreviewing] = useState(false);
  const previewUsed = useOpenedOnce(previewing);
  const card = useRef<HTMLButtonElement>(null);
  const extension = fileExtension(file.name) || "file";
  const imageSrc = useImageSrc(file);

  return (
    <>
      <div className={clsx("relative w-56 shrink-0")}>
        <button
          ref={card}
          type="button"
          onClick={() => setPreviewing(true)}
          aria-label={`Preview ${file.name}`}
          className={clsx(
            "flex w-full flex-col overflow-hidden rounded-lg text-left",
            "border border-ink/10 bg-surface hover:border-ink/25",
            "focus-visible:outline-2 focus-visible:outline-offset-2"
          )}
        >
          {file.kind === "image" ? (
            <span
              aria-hidden="true"
              className={clsx("block h-16 overflow-hidden border-b border-ink/10 bg-ink/3")}
            >
              {imageSrc && <img src={imageSrc} alt="" className={clsx("size-full object-cover")} />}
            </span>
          ) : (
            <span
              aria-hidden="true"
              className={clsx(
                "block h-16 overflow-hidden border-b border-ink/10 bg-ink/3 px-3 py-2",
                "whitespace-pre-wrap wrap-break-word font-mono text-xs leading-4 text-muted",
                "mask-b-from-40%"
              )}
            >
              {file.preview.slice(0, 280)}
            </span>
          )}
          <span className={clsx("flex items-center gap-3 px-3 py-2")}>
            <span
              aria-hidden="true"
              className={clsx(
                "flex size-8 shrink-0 items-center justify-center rounded-md bg-ink/8",
                "text-xs font-semibold uppercase tracking-wide"
              )}
            >
              {extension.slice(0, 4)}
            </span>
            <span className={clsx("min-w-0")}>
              <span className={clsx("block truncate text-sm font-medium")}>{file.name}</span>
              <span className={clsx("block truncate text-xs text-muted")}>
                {describeAttachment(file)}
              </span>
            </span>
          </span>
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${file.name}`}
            title="Remove"
            className={clsx(
              "absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full",
              "border border-ink/10 bg-surface text-muted hover:text-ink",
              "focus-visible:outline-2 focus-visible:outline-offset-2"
            )}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              className={clsx("size-3.5")}
            >
              <path d="m6 6 8 8M14 6l-8 8" />
            </svg>
          </button>
        )}
      </div>
      {previewUsed && (
        <Dialog
          open={previewing}
          title={file.name}
          origin={card}
          onClose={() => setPreviewing(false)}
        >
          {() => (
            <>
              <Caption tone="muted" className={clsx("-mt-4 mb-4")}>
                {extension.toUpperCase()} · {describeAttachment(file)}
              </Caption>
              {file.kind === "image" && imageSrc && (
                <img
                  src={imageSrc}
                  alt={file.name}
                  className={clsx("max-h-96 w-full rounded-md bg-ink/4 object-contain")}
                />
              )}
              {file.kind === "image" && imageSrc === null && (
                <BodyText tone="muted">This image is no longer available.</BodyText>
              )}
              {file.kind !== "image" &&
                (file.preview ? (
                  <pre
                    className={clsx(
                      "rounded-md bg-ink/4 p-3",
                      "whitespace-pre-wrap wrap-break-word font-mono text-xs leading-5"
                    )}
                  >
                    {file.preview}
                  </pre>
                ) : (
                  <BodyText tone="muted">No preview was saved for this file.</BodyText>
                ))}
              {file.truncated && (
                <Caption tone="muted" className={clsx("mt-3")}>
                  Showing the start of the file. The agent gets the full text.
                </Caption>
              )}
            </>
          )}
        </Dialog>
      )}
    </>
  );
}

export function AttachmentList({ attachments }: Readonly<{ attachments: CardFile[] }>) {
  if (!attachments.length) return null;
  return (
    <ul aria-label="Attached files" className={clsx("mt-2 flex flex-wrap gap-2")}>
      {attachments.map((file) => (
        <li key={file.name}>
          <AttachmentCard file={file} />
        </li>
      ))}
    </ul>
  );
}
