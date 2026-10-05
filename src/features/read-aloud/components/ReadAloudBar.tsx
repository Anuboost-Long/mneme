import clsx from "clsx";
import { useState } from "react";

import { languageName } from "../../../shared/lib/languageName";
import CassetteDeck, { DeckIcon, DeckKey } from "../../../shared/ui/CassetteDeck";
import Select from "../../../shared/ui/Select";
import { Caption } from "../../../shared/ui/Typography";
import { RATES, type ReadAloud } from "../lib/useReadAloud";

export default function ReadAloudBar({ reader }: Readonly<{ reader: ReadAloud }>) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  if (reader.status === "idle" && !reader.error) return null;

  const voice = reader.voices.find((item) => item.id === reader.voiceId);
  const languages = [...new Set(reader.voices.map((item) => item.lang))].sort((a, b) =>
    languageName(a).localeCompare(languageName(b))
  );
  const languageVoices = reader.voices.filter((item) => item.lang === voice?.lang);

  const statusLabels: Record<typeof reader.status, string> = {
    idle: "Stopped",
    preparing: "Preparing voice…",
    playing: "Reading",
    paused: "Paused"
  };
  const statusLabel = statusLabels[reader.status];

  function chooseLanguage(language: string) {
    const next =
      reader.voices.find((item) => item.lang === language && item.isDefault) ??
      reader.voices.find((item) => item.lang === language);
    if (next) reader.chooseVoice(next.id);
  }

  const playing = reader.status === "playing" || reader.status === "preparing";

  return (
    <section
      aria-label="Read aloud"
      className={clsx("fixed inset-x-4 bottom-6 z-40 mx-auto max-w-xl")}
    >
      {settingsOpen && (
        <div
          className={clsx(
            "mb-2 grid gap-3 rounded-lg border border-ink/15 bg-surface p-3 shadow-md sm:grid-cols-3"
          )}
        >
          <Select
            label="Speed"
            value={reader.rate}
            onChange={reader.chooseRate}
            options={RATES.map((rate) => ({ value: rate, label: `${rate}×` }))}
          />
          {voice && (
            <Select
              label="Language"
              value={voice.lang}
              onChange={chooseLanguage}
              options={languages.map((language) => ({
                value: language,
                label: languageName(language)
              }))}
            />
          )}
          {voice && (
            <Select
              label="Voice"
              value={voice.id}
              onChange={reader.chooseVoice}
              options={languageVoices.map((item) => ({
                value: item.id,
                label: item.downloaded ? `${item.name} (downloaded)` : item.name
              }))}
            />
          )}
        </div>
      )}
      <div className={clsx("rounded-lg bg-surface shadow-md")}>
        <CassetteDeck
          label={statusLabel}
          timer={`${reader.index + 1} / ${reader.total}`}
          wound={reader.total > 1 ? reader.index / (reader.total - 1) : 0}
          reels={reader.status === "playing" ? "turning" : "held"}
          tape={
            <input
              type="range"
              min={0}
              max={Math.max(0, reader.total - 1)}
              step={1}
              value={reader.index}
              onChange={(event) => reader.skip(Number(event.target.value) - reader.index)}
              aria-label="Paragraph"
              aria-valuetext={`Paragraph ${reader.index + 1} of ${reader.total}`}
              className={clsx("h-9 min-w-0 flex-1 cursor-pointer accent-accent")}
            />
          }
          controls={
            <>
              <DeckKey
                label="Previous paragraph"
                disabled={reader.index === 0}
                onClick={() => reader.skip(-1)}
              >
                <DeckIcon name="previous" />
              </DeckKey>
              {playing ? (
                <DeckKey
                  label="Pause"
                  tone="primary"
                  disabled={reader.status === "preparing"}
                  onClick={reader.pause}
                >
                  <DeckIcon name="pause" />
                </DeckKey>
              ) : (
                <DeckKey label="Play" tone="primary" onClick={reader.resume}>
                  <DeckIcon name="play" />
                </DeckKey>
              )}
              <DeckKey
                label="Next paragraph"
                disabled={reader.index >= reader.total - 1}
                onClick={() => reader.skip(1)}
              >
                <DeckIcon name="next" />
              </DeckKey>
              <label
                className={clsx("ml-1 flex shrink-0 items-center gap-1.5 text-muted max-sm:hidden")}
                title="Volume"
              >
                <DeckIcon name={reader.volume === 0 ? "muted" : "volume"} />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={reader.volume}
                  onChange={(event) => reader.chooseVolume(Number(event.target.value))}
                  aria-label="Volume"
                  aria-valuetext={`${Math.round(reader.volume * 100)}%`}
                  className={clsx("w-20 cursor-pointer accent-accent")}
                />
              </label>
              <span className={clsx("flex-1")} />
              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                aria-expanded={settingsOpen}
                className={clsx(
                  "h-8 shrink-0 rounded-md px-2.5 text-sm tabular-nums",
                  "text-muted",
                  "hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
                )}
              >
                {reader.rate}× · Voice
              </button>
              <DeckKey label="Stop reading" tone="quiet" onClick={reader.stop}>
                <DeckIcon name="close" />
              </DeckKey>
            </>
          }
        />
      </div>
      {reader.error && (
        <Caption
          role="alert"
          tone="error"
          className={clsx("mt-2 rounded-md bg-surface px-3 py-2 shadow-md")}
        >
          {reader.error}
        </Caption>
      )}
    </section>
  );
}
