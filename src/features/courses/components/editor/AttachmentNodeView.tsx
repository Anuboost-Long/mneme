import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import clsx from "clsx";
import { useEffect, useRef, useState, type SubmitEvent } from "react";

import { useOpenedOnce } from "../../../../shared/lib/dialogState";
import { errorMessage } from "../../../../shared/lib/errorMessage";
import { formatSize } from "../../../../shared/lib/formatSize";
import { pickFiles } from "../../../../shared/lib/pickFiles";
import { useFileUrl } from "../../../../shared/lib/useFileUrl";
import ConfirmDeleteDialog from "../../../../shared/ui/ConfirmDeleteDialog";
import { Caption } from "../../../../shared/ui/Typography";
import {
  createAttachment,
  deleteAttachment,
  getAttachment,
  openAttachment,
  renameAttachment,
  revealAttachment,
  saveAttachmentCopy
} from "../../lib/attachment/actions";
import type { Attachment } from "../../lib/attachment/types";
import { fileExtension } from "../../lib/page-files";
import ItemMenu from "../ItemMenu";

const folderIcon = "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z";
const saveIcon = "M12 4v11m0 0-4-4m4 4 4-4M5 19h14";

export default function AttachmentNodeView({
  node,
  deleteNode,
  editor,
  extension,
  updateAttributes
}: Readonly<ReactNodeViewProps>) {
  const attachmentId = node.attrs.attachmentId as number | null;
  const [attachment, setAttachment] = useState<Attachment | null | undefined>();
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  const deleteUsed = useOpenedOnce(mode === "delete");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const isAudio = attachment?.mime_type?.startsWith("audio/") ?? false;
  const audioUrl = useFileUrl(isAudio ? attachment?.file_path : null);

  useEffect(() => {
    let active = true;
    if (attachmentId === null) setAttachment(null);
    else
      getAttachment(attachmentId)
        .then((row) => active && setAttachment(row))
        .catch(() => active && setAttachment(null));
    return () => {
      active = false;
    };
  }, [attachmentId]);

  useEffect(() => {
    if (mode === "rename") nameInput.current?.select();
  }, [mode]);

  if (attachmentId === null) {
    return (
      <NodeViewWrapper>
        <FileChooser
          pageId={(extension.options as { pageId: number }).pageId}
          disabled={!editor.isEditable}
          onChosen={(id) => updateAttributes({ attachmentId: id })}
        />
      </NodeViewWrapper>
    );
  }

  if (attachment === undefined) return <NodeViewWrapper />;

  if (attachment === null) {
    return (
      <NodeViewWrapper
        contentEditable={false}
        className={clsx("rounded-lg p-3", "border border-dashed border-ink/20")}
      >
        <Caption tone="muted">This attachment is no longer available.</Caption>
      </NodeViewWrapper>
    );
  }

  const label = fileExtension(attachment.file_name)?.toUpperCase() ?? "FILE";

  function rename(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attachment) return;
    setError(null);
    renameAttachment(attachment, name)
      .then((fileName) => {
        setAttachment({ ...attachment, file_name: fileName });
        setMode("view");
      })
      .catch((error_) => setError(errorMessage(error_, "Couldn’t rename this file. Try again.")));
  }

  function act(action: (attachment: Attachment) => Promise<unknown>, failure: string) {
    if (!attachment) return;
    setError(null);
    action(attachment).catch((error_) => setError(errorMessage(error_, failure)));
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={clsx("rounded-lg p-3", "border border-ink/15")}
    >
      <div className={clsx("flex items-center gap-3")}>
        <span
          aria-hidden="true"
          className={clsx(
            "flex size-10 shrink-0 items-center justify-center rounded-md",
            "bg-ink/6 text-ink",
            "text-xs font-bold"
          )}
        >
          {label.slice(0, 4)}
        </span>
        {mode === "rename" ? (
          <form onSubmit={rename} className={clsx("flex min-w-0 flex-1 items-center gap-2")}>
            <input
              ref={nameInput}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && setMode("view")}
              aria-label="File name"
              className={clsx(
                "h-8 min-w-0 flex-1 rounded-md",
                "border border-ink/20 bg-surface",
                "px-2 text-sm",
                "focus-visible:outline-1 focus-visible:outline-ink"
              )}
            />
            <button
              type="button"
              onClick={() => setMode("view")}
              className={clsx(
                "h-8 rounded-md px-3 text-sm",
                "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-ink"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={clsx(
                "h-8 rounded-md",
                "bg-action text-on-action",
                "px-3 text-sm font-medium",
                "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
              )}
            >
              Save name
            </button>
          </form>
        ) : (
          <>
            <div className={clsx("min-w-0 flex-1")}>
              <p className={clsx("truncate text-sm font-medium")}>{attachment.file_name}</p>
              <Caption tone="muted">
                {label}
                {attachment.size_bytes === null ? "" : ` · ${formatSize(attachment.size_bytes)}`}
              </Caption>
            </div>
            <button
              type="button"
              onClick={() => act(openAttachment, "Couldn’t open this file. Try Show in Finder.")}
              className={clsx(
                "h-8 shrink-0 rounded-md",
                "border border-ink/20 bg-surface",
                "px-3 text-sm",
                "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-ink"
              )}
            >
              Open
            </button>
            {editor.isEditable && (
              <ItemMenu
                label={attachment.file_name}
                editLabel="Rename"
                onEdit={() => {
                  setName(attachment.file_name);
                  setMode("rename");
                }}
                onDelete={() => setMode("delete")}
                actions={[
                  {
                    label: "Show in Finder",
                    icon: folderIcon,
                    onSelect: () =>
                      act(revealAttachment, "Couldn’t show this file in Finder. Try again.")
                  },
                  {
                    label: "Save a copy…",
                    icon: saveIcon,
                    onSelect: () =>
                      act(saveAttachmentCopy, "Couldn’t save a copy of this file. Try again.")
                  }
                ]}
              />
            )}
          </>
        )}
      </div>
      {isAudio && audioUrl && (
        <audio src={audioUrl} controls preload="metadata" className={clsx("mt-3 w-full")}>
          <track kind="captions" />
        </audio>
      )}
      {error && (
        <Caption tone="error" className={clsx("mt-2")}>
          {error}
        </Caption>
      )}
      {deleteUsed && (
        <ConfirmDeleteDialog
          open={mode === "delete"}
          title="Delete file?"
          message={`“${attachment.file_name}” will be permanently deleted from this page. This can’t be undone.`}
          confirmLabel="Delete file"
          failure="Couldn’t delete this file. Try again."
          onConfirm={() => deleteAttachment(attachment.id)}
          onClose={() => setMode("view")}
          onDeleted={deleteNode}
        />
      )}
    </NodeViewWrapper>
  );
}

function FileChooser({
  pageId,
  disabled,
  onChosen
}: Readonly<{ pageId: number; disabled: boolean; onChosen: (id: number) => void }>) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose() {
    setError(null);
    const [picked] = await pickFiles().catch(() => []);
    if (!picked) return;
    setSaving(true);
    try {
      onChosen(await createAttachment(pageId, picked));
    } catch (chooseError) {
      setError(errorMessage(chooseError, "Couldn’t attach this file. Try another one."));
      setSaving(false);
    }
  }

  return (
    <div
      contentEditable={false}
      className={clsx(
        "flex flex-wrap items-center gap-3 rounded-lg p-3",
        "border border-dashed border-ink/20"
      )}
    >
      <button
        type="button"
        disabled={disabled || saving}
        onClick={() => void choose()}
        className={clsx(
          "h-8 rounded-md",
          "border border-ink/20 bg-surface",
          "px-3 text-sm",
          "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-ink"
        )}
      >
        {saving ? "Attaching…" : "Choose a file to attach…"}
      </button>
      <Caption tone="muted">or drop one anywhere on the page</Caption>
      {error && (
        <Caption tone="error" className={clsx("w-full")}>
          {error}
        </Caption>
      )}
    </div>
  );
}
