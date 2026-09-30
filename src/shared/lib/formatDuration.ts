export function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const parts = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60];
  const [hours, ...rest] = parts;
  return (hours ? parts : rest)
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, "0")))
    .join(":");
}
