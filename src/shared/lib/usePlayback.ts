import { useEffect, useRef, useState, type SyntheticEvent } from "react";

import { errorMessage } from "./errorMessage";
import { usePlaybackSpeed, usePlaybackVolume } from "./playbackPreferences";

export function usePlayback(
  src: string | undefined,
  savedLengthMs: number,
  onError: (message: string) => void
) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  // Preferred over the saved length, which can run slightly ahead of the
  // audio (a recorder's wall clock).
  const [fileLengthMs, setFileLengthMs] = useState<number>();
  const [speed, setSpeed] = usePlaybackSpeed();
  const [volume, setVolume] = usePlaybackVolume();
  const [muted, setMuted] = useState(false);
  const lengthMs = fileLengthMs ?? savedLengthMs;

  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    element.defaultPlaybackRate = element.playbackRate = Number(speed);
    element.volume = volume;
    element.muted = muted;
  }, [speed, volume, muted, src]);

  // timeupdate fires only about four times a second, too coarse for the
  // tape and reels.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    function follow() {
      if (audio.current) setPositionMs(audio.current.currentTime * 1000);
      frame = requestAnimationFrame(follow);
    }
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  function seek(ms: number) {
    const next = Math.min(lengthMs, Math.max(0, ms));
    if (audio.current) audio.current.currentTime = next / 1000;
    setPositionMs(next);
  }

  function toggle() {
    const element = audio.current;
    if (!element) return;
    if (element.paused)
      element
        .play()
        .catch((error) => onError(errorMessage(error, "Couldn’t play this audio. Try again.")));
    else element.pause();
  }

  return {
    playing,
    positionMs,
    lengthMs,
    seek,
    toggle,
    speed,
    setSpeed,
    volume: muted ? 0 : volume,
    setVolume: (next: number) => {
      setVolume(next);
      setMuted(false);
    },
    toggleMute: () => setMuted(!muted),
    audioProps: {
      ref: audio,
      src,
      preload: "metadata" as const,
      onPlay: () => setPlaying(true),
      onPause: () => setPlaying(false),
      onTimeUpdate: (event: SyntheticEvent<HTMLAudioElement>) =>
        setPositionMs(event.currentTarget.currentTime * 1000),
      onDurationChange: (event: SyntheticEvent<HTMLAudioElement>) => {
        const seconds = event.currentTarget.duration;
        if (Number.isFinite(seconds)) setFileLengthMs(seconds * 1000);
      },
      onEnded: () => setPositionMs(lengthMs)
    }
  };
}
