import { useStoredChoice } from "./useStoredChoice";

export const skipIntervals = ["5", "10", "15", "30"] as const;
export const playbackSpeeds = ["0.75", "1", "1.25", "1.5", "2"] as const;
// Tenths, so the volume slider's steps map onto stored choices.
const volumes = ["0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1"] as const;

export function useSkipInterval() {
  return useStoredChoice("mneme.recordings.skipSeconds", skipIntervals, "10");
}

export function usePlaybackSpeed() {
  return useStoredChoice("mneme.recordings.speed", playbackSpeeds, "1");
}

export function usePlaybackVolume() {
  const [volume, setVolume] = useStoredChoice("mneme.recordings.volume", volumes, "1");
  return [Number(volume), (next: number) => setVolume(String(Math.round(next * 10) / 10) as (typeof volumes)[number])] as const;
}
