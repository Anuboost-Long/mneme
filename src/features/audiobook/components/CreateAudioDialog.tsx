import clsx from "clsx";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useResetOnOpen } from "../../../shared/lib/dialogState";
import { errorMessage } from "../../../shared/lib/errorMessage";
import { languageName } from "../../../shared/lib/languageName";
import Dialog from "../../../shared/ui/Dialog";
import Select from "../../../shared/ui/Select";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import { useExtensions } from "../../extensions/lib/extensionsState";
import type { ReadableChunk } from "../../read-aloud/lib/readableText";
import { downloadedVoices, RATES } from "../../read-aloud/lib/useReadAloud";
import { cancelCompile, compilePageAudio } from "../lib/page-audio/actions";
import type { PageAudio } from "../lib/page-audio/types";

export default function CreateAudioDialog({
  open,
  pageId,
  chunks,
  preferredVoiceId,
  replacing,
  onCreated,
  onClose
}: Readonly<{
  open: boolean;
  pageId: number;
  chunks: () => ReadableChunk[];
  preferredVoiceId?: string;
  replacing: boolean;
  onCreated: (audio: PageAudio) => void;
  onClose: () => void;
}>) {
  const { installed } = useExtensions();
  const voices = downloadedVoices(installed);
  const [voiceId, setVoiceId] = useState<string | undefined>(
    () => voices.find((item) => item.id === preferredVoiceId)?.id ?? voices[0]?.id
  );
  const voice = voices.find((item) => item.id === voiceId) ?? voices[0];
  const [speed, setSpeed] = useState<number>(1);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  useResetOnOpen(open, () => {
    setVoiceId(voices.find((item) => item.id === preferredVoiceId)?.id ?? voices[0]?.id);
    setSpeed(1);
    setProgress(null);
    setError(null);
  });
  const languages = [...new Set(voices.map((item) => item.lang))];

  async function create(complete: (callback: () => void) => void) {
    if (!voice) return;
    setError(null);
    setProgress(0);
    try {
      const audio = await compilePageAudio(pageId, chunks(), voice, speed, setProgress);
      complete(() => onCreated(audio));
    } catch (error_) {
      setProgress(null);
      if ((error_ as { code?: string } | null)?.code === "CANCELLED") return;
      setError(errorMessage(error_, "Couldn’t create the audio. Try again."));
    }
  }

  const creating = progress !== null;

  return (
    <Dialog open={open} title="Download page audio" busy={creating} onClose={onClose}>
      {(close, complete) => (
        <>
          <BodyText tone="muted">
            Reads this page into one audio file saved on this device, so you can listen offline. It
            takes about 0.5 MB per minute of audio, and you can delete it any time.
            {replacing && " It replaces the page’s current audio."}
          </BodyText>
          {voice ? (
            <div className={clsx("mt-6 grid gap-4 sm:grid-cols-3")}>
              <Select
                label="Language"
                value={voice.lang}
                disabled={creating}
                onChange={(language) =>
                  setVoiceId(voices.find((item) => item.lang === language)?.id)
                }
                options={languages.map((language) => ({
                  value: language,
                  label: languageName(language)
                }))}
              />
              <Select
                label="Voice"
                value={voice.id}
                disabled={creating}
                onChange={setVoiceId}
                options={voices
                  .filter((item) => item.lang === voice.lang)
                  .map((item) => ({ value: item.id, label: item.name }))}
              />
              <Select
                label="Speed"
                value={speed}
                disabled={creating}
                onChange={setSpeed}
                options={RATES.map((rate) => ({ value: rate, label: `${rate}×` }))}
              />
            </div>
          ) : (
            <BodyText className={clsx("mt-6")}>
              Audio files are made with a downloaded voice.{" "}
              <Link to="/settings/extensions" className={clsx("underline underline-offset-2")}>
                Download a voice in Settings
              </Link>{" "}
              first.
            </BodyText>
          )}
          {creating && (
            <div className={clsx("mt-6")}>
              <progress
                aria-label="Creating audio"
                value={progress}
                className={clsx("h-1.5 w-full accent-chain-lime")}
              />
              <Caption tone="muted" className={clsx("mt-2 tabular-nums")}>
                Creating audio with {voice?.name}… {Math.round(progress * 100)}%
              </Caption>
            </div>
          )}
          {error && (
            <BodyText role="alert" tone="error" className={clsx("mt-4")}>
              {error}
            </BodyText>
          )}
          <div className={clsx("mt-8 flex justify-end gap-3")}>
            <button
              type="button"
              onClick={creating ? () => void cancelCompile() : close}
              className={clsx(
                "rounded-md border border-ink/15 px-4 py-2 text-sm",
                "hover:bg-ink/5"
              )}
            >
              {creating ? "Cancel download" : "Cancel"}
            </button>
            {voice && (
              <button
                type="button"
                disabled={creating}
                onClick={() => void create(complete)}
                className={clsx(
                  "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                  "hover:bg-action/85"
                )}
              >
                {creating ? "Downloading…" : "Download audio"}
              </button>
            )}
          </div>
        </>
      )}
    </Dialog>
  );
}
