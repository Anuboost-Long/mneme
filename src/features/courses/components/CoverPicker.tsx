import { checkImage, deleteImage, storeImage } from "@/features/courses/lib/page-image";
import { errorMessage } from "@/shared/lib/errorMessage";
import { IMAGE_EXTENSIONS, pickFiles } from "@/shared/lib/pickFiles";
import { useFileUrl } from "@/shared/lib/useFileUrl";
import { BodyText, Typography } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState } from "react";

// A cover already stored (`reference`) or a new picture chosen in this
// form (`file`), which is only written when the form is saved.
export type CoverChoice = { reference: string | null; file: File | null };

// Writes a newly chosen cover, then saves with its reference. If saving
// fails, the new file is deleted again so nothing is left behind.
export async function saveWithCover<T>(
  cover: CoverChoice,
  save: (reference: string | null) => Promise<T>
) {
  const stored = cover.file ? await storeImage(cover.file) : null;
  try {
    return await save(stored ?? cover.reference);
  } catch (error) {
    if (stored) await deleteImage(stored);
    throw error;
  }
}

export default function CoverPicker({
  value,
  onChange
}: Readonly<{
  value: CoverChoice;
  onChange: (value: CoverChoice) => void;
}>) {
  const storedUrl = useFileUrl(value.file ? null : value.reference);
  const [fileUrl, setFileUrl] = useState<string>();
  const [error, setError] = useState("");
  const preview = fileUrl ?? storedUrl;
  const hasCover = value.file !== null || value.reference !== null;

  useEffect(() => {
    if (!value.file) {
      setFileUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(value.file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value.file]);

  function choose(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      checkImage(file);
      onChange({ reference: value.reference, file });
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t use this picture. Try another file."));
    }
  }

  return (
    <div className={clsx("space-y-2")}>
      <Typography as="span" variant="label" className={clsx("block")}>
        Cover
      </Typography>
      <div
        className={clsx(
          "aspect-16/5 w-full overflow-hidden rounded-md",
          "border border-dashed border-ink/20 bg-ink/5"
        )}
      >
        {preview && <img src={preview} alt="" className={clsx("size-full object-cover")} />}
      </div>
      <div className={clsx("flex flex-wrap items-center gap-3")}>
        <button
          type="button"
          onClick={() =>
            void pickFiles({ extensions: IMAGE_EXTENSIONS })
              .then(([file]) => choose(file))
              .catch((error_) =>
                setError(errorMessage(error_, "Couldn’t open the file picker. Try again."))
              )
          }
          className={clsx(
            "inline-flex items-center rounded-md",
            "border border-ink/20",
            "px-3 py-2 text-sm",
            "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-offset-4"
          )}
        >
          {hasCover ? "Change cover" : "Add cover"}
        </button>
        {hasCover && (
          <button
            type="button"
            onClick={() => onChange({ reference: null, file: null })}
            className={clsx("text-sm underline underline-offset-4")}
          >
            Remove cover
          </button>
        )}
      </div>
      <BodyText tone="muted">
        A wide picture works best. PNG, JPEG, WebP, GIF or SVG, up to 10 MB.
      </BodyText>
      {error && (
        <BodyText role="alert" tone="error">
          {error}
        </BodyText>
      )}
    </div>
  );
}
