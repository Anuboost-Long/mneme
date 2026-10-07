import { kindDescriptions, type ContentKind } from "@/features/courses/lib/content-detection";
import { Caption } from "@/shared/ui/Typography";
import clsx from "clsx";

export type Guess = { kind: ContentKind; sure: boolean; byAi?: boolean };

function guessMessage({ kind, sure, byAi }: Guess) {
  if (!sure) return "Couldn’t tell what kind of page this is, so it’s set to Lesson.";
  return `${byAi ? "The AI says this is" : "Looks like"} ${kindDescriptions[kind]}.`;
}

export default function KindGuess({
  guess,
  asking,
  onAskAi
}: Readonly<{ guess: Guess; asking: boolean; onAskAi: () => void }>) {
  return (
    <div className={clsx("-mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1")}>
      <Caption tone="muted">{guessMessage(guess)}</Caption>
      {!guess.sure && (
        <button
          type="button"
          disabled={asking}
          onClick={onAskAi}
          className={clsx("text-sm font-medium underline underline-offset-4", "hover:text-muted")}
        >
          {asking ? "Asking…" : "Ask AI"}
        </button>
      )}
    </div>
  );
}
