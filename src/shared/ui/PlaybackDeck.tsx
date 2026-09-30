import clsx from "clsx";
import type { ReactNode } from "react";

import { formatDuration } from "../lib/formatDuration";
import { playbackSpeeds, useSkipInterval } from "../lib/playbackPreferences";
import type { usePlayback } from "../lib/usePlayback";
import CassetteDeck, { DeckIcon, DeckKey } from "./CassetteDeck";
import Select from "./Select";

type Playback = ReturnType<typeof usePlayback>;

export default function PlaybackDeck({
  label,
  playback,
  controls
}: Readonly<{ label: ReactNode; playback: Playback; controls: ReactNode }>) {
  const { playing, positionMs, lengthMs } = playback;

  return (
    <>
      <CassetteDeck
        label={label}
        timer={`${formatDuration(positionMs)} / ${formatDuration(lengthMs)}`}
        wound={lengthMs ? positionMs / lengthMs : 0}
        reels={playing ? "turning" : "held"}
        tape={
          <input
            type="range"
            min={0}
            max={lengthMs}
            step="any"
            value={positionMs}
            onChange={(event) => playback.seek(Number(event.target.value))}
            aria-label="Playback position"
            aria-valuetext={formatDuration(positionMs)}
            className={clsx("h-9 min-w-0 flex-1 cursor-pointer accent-chain-lime")}
          />
        }
        controls={controls}
      />
      {/* Nothing here is captioned yet, so the track is empty. */}
      <audio {...playback.audioProps} className={clsx("hidden")}>
        <track kind="captions" />
      </audio>
    </>
  );
}

export function PlaybackKeys({ playback }: Readonly<{ playback: Playback }>) {
  const [skipInterval] = useSkipInterval();
  const skipMs = Number(skipInterval) * 1000;
  const { playing, positionMs, seek } = playback;

  return (
    <>
      <DeckKey label={`Back ${skipInterval} seconds`} onClick={() => seek(positionMs - skipMs)}>
        <DeckIcon name="back" />
      </DeckKey>
      <DeckKey label={playing ? "Pause" : "Play"} tone="primary" onClick={playback.toggle}>
        <DeckIcon name={playing ? "pause" : "play"} />
      </DeckKey>
      <DeckKey label={`Forward ${skipInterval} seconds`} onClick={() => seek(positionMs + skipMs)}>
        <DeckIcon name="forward" />
      </DeckKey>
      <Select
        compact
        hideLabel
        label="Playback speed"
        value={playback.speed}
        onChange={playback.setSpeed}
        options={playbackSpeeds.map((option) => ({ value: option, label: `${option}×` }))}
        className={clsx("w-20 shrink-0")}
      />
      <span className={clsx("flex items-center gap-1")}>
        <DeckKey
          label={playback.volume ? "Mute" : "Unmute"}
          tone="quiet"
          onClick={playback.toggleMute}
        >
          <DeckIcon name={playback.volume ? "volume" : "muted"} />
        </DeckKey>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={playback.volume}
          onChange={(event) => playback.setVolume(Number(event.target.value))}
          aria-label="Volume"
          aria-valuetext={`${Math.round(playback.volume * 100)}%`}
          className={clsx("w-20 cursor-pointer accent-chain-lime max-sm:hidden")}
        />
      </span>
    </>
  );
}
