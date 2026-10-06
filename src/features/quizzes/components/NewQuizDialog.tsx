import clsx from "clsx";
import { useState, type SubmitEvent } from "react";

import type { Module } from "@/features/courses/lib/module/types";
import { pageContentPreview, type Page } from "@/features/courses/lib/page/types";
import { useResetOnOpen } from "@/shared/lib/dialogState";
import Dialog from "@/shared/ui/Dialog";
import Select from "@/shared/ui/Select";
import { BodyText, Typography } from "@/shared/ui/Typography";

import { startQuiz } from "../lib/quizJobs";
import { questionKindLabels, questionKinds, type QuestionKind } from "../lib/quiz/types";

const sizes = [5, 10, 15, 20].map((size) => ({ value: size, label: `${size} questions` }));
const WHOLE_MODULE = 0;

export default function NewQuizDialog({
  open,
  courseId,
  module,
  pages,
  pageId,
  onClose
}: Readonly<{
  open: boolean;
  courseId: number;
  module: Pick<Module, "id" | "name">;
  pages: Page[];
  pageId?: number;
  onClose: () => void;
}>) {
  const [source, setSource] = useState(WHOLE_MODULE);
  const [size, setSize] = useState(10);
  const [kinds, setKinds] = useState<QuestionKind[]>(questionKinds);
  const [error, setError] = useState("");

  useResetOnOpen(open, () => {
    setSource(pageId ?? WHOLE_MODULE);
    setError("");
  });

  function toggleKind(kind: QuestionKind) {
    setKinds((current) =>
      current.includes(kind) ? current.filter((item) => item !== kind) : questionKinds.filter((item) => item === kind || current.includes(item))
    );
  }

  function create(event: SubmitEvent<HTMLFormElement>, close: () => void) {
    event.preventDefault();
    const page = pages.find((item) => item.id === source);
    const covered = (page ? [page] : pages).filter((item) => pageContentPreview(item.content));
    if (!covered.length) {
      setError(page ? "This page has no text to quiz on yet." : "This module’s pages have no text to quiz on yet.");
      return;
    }
    startQuiz({ courseId, module, page, pages: covered, size, kinds });
    close();
  }

  return (
    <Dialog open={open} title="New quiz" onClose={onClose}>
      {(close) => (
        <form onSubmit={(event) => create(event, close)} className={clsx("space-y-5")}>
          <div className={clsx("grid gap-5 sm:grid-cols-2")}>
            <Select
              label="Questions from"
              value={source}
              onChange={setSource}
              options={[{ value: WHOLE_MODULE, label: `All of ${module.name}` }, ...pages.map((page) => ({ value: page.id, label: page.title }))]}
            />
            <Select label="Length" value={size} onChange={setSize} options={sizes} />
          </div>
          <fieldset className={clsx("space-y-2")}>
            <legend>
              <Typography as="span" variant="label">
                Question types
              </Typography>
            </legend>
            <div className={clsx("flex flex-wrap gap-x-6 gap-y-2")}>
              {questionKinds.map((kind) => (
                <label key={kind} className={clsx("flex cursor-pointer items-center gap-2 text-sm")}>
                  <input
                    type="checkbox"
                    checked={kinds.includes(kind)}
                    onChange={() => toggleKind(kind)}
                    className={clsx("accent-current")}
                  />
                  {questionKindLabels[kind]}
                </label>
              ))}
            </div>
          </fieldset>
          <BodyText tone="muted">
            The quiz is written in the background, so you can keep working. You’ll get a message when it’s ready.
          </BodyText>
          {error && (
            <BodyText role="alert" tone="error">
              {error}
            </BodyText>
          )}
          <div className={clsx("flex justify-end gap-3 border-t border-ink/10 pt-5")}>
            <button
              type="button"
              onClick={close}
              className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!kinds.length}
              className={clsx("rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action", "hover:bg-action/85 disabled:opacity-50")}
            >
              Make quiz
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
