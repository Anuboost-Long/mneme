import { storePageFile, videoEmbedUrl } from "@/features/courses/lib/page-files";
import { errorMessage } from "@/shared/lib/errorMessage";
import { pickFiles, VIDEO_EXTENSIONS } from "@/shared/lib/pickFiles";
import { useFileUrl } from "@/shared/lib/useFileUrl";
import { Caption } from "@/shared/ui/Typography";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import clsx from "clsx";
import { useState, type SubmitEvent } from "react";

export default function VideoNodeView({
  node,
  updateAttributes,
  editor
}: Readonly<ReactNodeViewProps>) {
  const embed = node.attrs.embed as string | null;
  const file = node.attrs.file as string | null;
  const fileUrl = useFileUrl(file);

  if (embed) {
    return (
      <NodeViewWrapper>
        <iframe
          src={embed}
          title="Embedded video"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className={clsx("aspect-video w-full rounded-lg", "bg-ink/5")}
        />
      </NodeViewWrapper>
    );
  }

  if (file) {
    return (
      <NodeViewWrapper>
        <video
          src={fileUrl}
          controls
          preload="metadata"
          className={clsx("aspect-video w-full rounded-lg", "bg-black")}
        >
          <track kind="captions" />
        </video>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <VideoChooser disabled={!editor.isEditable} onChoose={updateAttributes} />
    </NodeViewWrapper>
  );
}

function VideoChooser({
  disabled,
  onChoose
}: Readonly<{
  disabled: boolean;
  onChoose: (attributes: { embed?: string; file?: string }) => void;
}>) {
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function embedLink(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const embed = videoEmbedUrl(link);
    if (embed) onChoose({ embed });
    else setError("Paste a YouTube or Vimeo link, or upload a video file.");
  }

  async function upload() {
    setError(null);
    const [picked] = await pickFiles({ extensions: VIDEO_EXTENSIONS }).catch(() => []);
    if (!picked) return;
    setUploading(true);
    try {
      onChoose({ file: await storePageFile(picked) });
    } catch (uploadError) {
      setError(errorMessage(uploadError, "Couldn’t save this video. Try another file."));
      setUploading(false);
    }
  }

  return (
    <div
      contentEditable={false}
      className={clsx("space-y-2 rounded-lg p-3", "border border-ink/15")}
    >
      <form onSubmit={embedLink} className={clsx("flex gap-2")}>
        <input
          type="url"
          value={link}
          disabled={disabled || uploading}
          onChange={(event) => {
            setLink(event.target.value);
            setError(null);
          }}
          placeholder="Paste a YouTube or Vimeo link"
          aria-label="Video link"
          className={clsx(
            "h-8 min-w-0 flex-1 rounded-md",
            "border border-ink/20 bg-surface",
            "px-2 text-sm",
            "focus-visible:outline-1 focus-visible:outline-ink"
          )}
        />
        <button
          type="submit"
          disabled={disabled || uploading || !link.trim()}
          className={clsx(
            "h-8 shrink-0 rounded-md",
            "bg-action text-on-action",
            "px-3 text-sm font-medium",
            "disabled:opacity-50 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
          )}
        >
          Embed video
        </button>
      </form>
      <div className={clsx("flex items-center gap-2")}>
        <Caption tone="muted">or</Caption>
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => void upload()}
          className={clsx(
            "h-8 rounded-md",
            "border border-ink/20 bg-surface",
            "px-3 text-sm",
            "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-ink"
          )}
        >
          {uploading ? "Saving video…" : "Upload a video file…"}
        </button>
      </div>
      {error && <Caption tone="error">{error}</Caption>}
    </div>
  );
}
