import clsx from "clsx";
import { useEffect, useState } from "react";

import { Caption } from "../../../shared/ui/Typography";

const TICK_MS = 250;
const CEILING = 0.92;
const EASE = 0.035;

export default function ImportProgress({
  stages,
  saved
}: Readonly<{ stages: string[]; saved?: { done: number; total: number } }>) {
  const [estimate, setEstimate] = useState(0.04);

  useEffect(() => {
    const timer = setInterval(
      () => setEstimate((current) => current + (CEILING - current) * EASE),
      TICK_MS
    );
    return () => clearInterval(timer);
  }, []);

  const stage =
    stages[Math.min(Math.floor((estimate / CEILING) * stages.length), stages.length - 1)];
  const value = saved?.total ? saved.done / saved.total : estimate;
  const label = saved?.total ? `Saving pictures ${saved.done + 1} of ${saved.total}…` : stage;

  return (
    <div className={clsx("mt-5 space-y-2")}>
      <progress
        value={value}
        max={1}
        aria-label="Import progress"
        className={clsx("import-progress block h-1.5 w-full")}
      />
      <Caption role="status" tone="muted">
        {label}
      </Caption>
    </div>
  );
}
