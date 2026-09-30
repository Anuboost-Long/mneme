import clsx from "clsx";
import { useEffect, useState } from "react";

import { extractText } from "../../../../shared/lib/ocr";
import Dialog from "../../../../shared/ui/Dialog";
import { BodyText, Caption } from "../../../../shared/ui/Typography";

export type ExtractPlacement = "below" | "replace";

export default function ExtractTextDialog({
  imageSrc,
  onInsert,
  onClose
}: Readonly<{
  imageSrc: string;
  onInsert: (text: string, placement: ExtractPlacement) => void;
  onClose: () => void;
}>) {
  const [text, setText] = useState<string | null>(null);
  const [uncertainLines, setUncertainLines] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    extractText(imageSrc)
      .then((result) => {
        if (active) {
          setText(result.text);
          setUncertainLines(result.uncertainLines);
        }
      })
      .catch((error_: Error) => active && setError(error_.message));
    return () => {
      active = false;
    };
  }, [imageSrc]);

  const empty = text !== null && !text.trim();
  const uncertainNote =
    uncertainLines === 1
      ? "1 line was hard to read."
      : `${uncertainLines} lines were hard to read.`;

  return (
    <Dialog title="Extract text" onClose={onClose}>
      {(close, complete) => (
        <>
          {text === null && !error && (
            <BodyText role="status" tone="muted">
              Reading the image…
            </BodyText>
          )}
          {error && (
            <BodyText role="alert" tone="error">
              {error}
            </BodyText>
          )}
          {text !== null &&
            (empty ? (
              <BodyText tone="muted">No text found in this image.</BodyText>
            ) : (
              <>
                <label htmlFor="extracted-text" className={clsx("block text-sm font-medium")}>
                  Extracted text
                </label>
                <Caption tone="muted" className={clsx("mt-1")}>
                  {uncertainLines > 0
                    ? `${uncertainNote} Check the text before inserting.`
                    : "Correct anything that was misread before inserting."}
                </Caption>
                <textarea
                  id="extracted-text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={12}
                  className={clsx(
                    "mt-3 block w-full resize-y rounded-md",
                    "border border-ink/20 bg-surface",
                    "px-3 py-2 text-sm leading-6",
                    "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  )}
                />
                <Caption tone="muted" className={clsx("mt-2")}>
                  The inserted text is selected, so you can run an AI action on it right away.
                </Caption>
              </>
            ))}
          <div className={clsx("mt-8 flex flex-wrap justify-end gap-3")}>
            <button
              type="button"
              onClick={close}
              className={clsx(
                "rounded-md border border-ink/15 px-4 py-2 text-sm",
                "hover:bg-ink/5"
              )}
            >
              {text && !empty ? "Cancel" : "Close"}
            </button>
            {text !== null && !empty && (
              <>
                <button
                  type="button"
                  onClick={() => complete(() => onInsert(text, "replace"))}
                  className={clsx(
                    "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
                    "hover:bg-ink/5"
                  )}
                >
                  Replace image
                </button>
                <button
                  type="button"
                  onClick={() => complete(() => onInsert(text, "below"))}
                  className={clsx(
                    "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                    "hover:bg-action/85"
                  )}
                >
                  Insert below image
                </button>
              </>
            )}
          </div>
        </>
      )}
    </Dialog>
  );
}
