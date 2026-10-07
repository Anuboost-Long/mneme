import { BodyText, Caption, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { Link } from "react-router-dom";

import {
  isRight,
  QuestionKind,
  rightAnswer,
  type AttemptAnswer,
  type Question
} from "../lib/quiz/types";

export const primaryButton = clsx(
  "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
  "hover:bg-action/85 disabled:opacity-50"
);
export const secondaryButton = clsx(
  "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
  "hover:bg-ink/5"
);

function options(question: Question) {
  if (question.kind === QuestionKind.TrueFalse)
    return [
      { value: "true", label: "True" },
      { value: "false", label: "False" }
    ];
  return (question.choices ?? []).map((label, index) => ({ value: String(index), label }));
}

function Feedback({
  question,
  correct,
  pagePath
}: Readonly<{ question: Question; correct: boolean | null; pagePath: string | null }>) {
  let verdict = "Model answer";
  if (correct === true) verdict = "Right";
  else if (correct === false) verdict = "Not quite";
  return (
    <output className={clsx("block space-y-2 border-t border-ink/10 pt-4")}>
      <p
        className={clsx(
          "text-sm font-semibold",
          correct === true && "text-success",
          correct === false && "text-danger"
        )}
      >
        {verdict}
      </p>
      {question.kind === QuestionKind.ShortAnswer ? (
        <BodyText className={clsx("whitespace-pre-wrap")}>{question.answer}</BodyText>
      ) : (
        correct === false && <BodyText>The answer is {rightAnswer(question)}.</BodyText>
      )}
      {question.explanation && <BodyText tone="muted">{question.explanation}</BodyText>}
      {pagePath && question.page_title && (
        <Caption tone="muted" className={clsx("block")}>
          From{" "}
          <Link to={pagePath} className={clsx("underline underline-offset-4 hover:text-ink")}>
            {question.page_title}
          </Link>
        </Caption>
      )}
    </output>
  );
}

export default function QuizRunner({
  questions,
  pagePath,
  finishLabel,
  onFinish
}: Readonly<{
  questions: Question[];
  pagePath: (pageId: number | null) => string | null;
  finishLabel: string;
  onFinish: (answers: AttemptAnswer[]) => void;
}>) {
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<AttemptAnswer[]>([]);
  const question = questions[index] as Question | undefined;
  const answered = answers.length > index;
  const answerField = useRef<HTMLTextAreaElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (checked) nextButton.current?.focus();
    else answerField.current?.focus();
  }, [index, checked, answered]);

  useEffect(() => {
    if (!question || checked || question.kind === QuestionKind.ShortAnswer) return;
    function pickByNumber(event: KeyboardEvent) {
      if (
        !question ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.target instanceof HTMLTextAreaElement
      )
        return;
      const choice = options(question)[Number(event.key) - 1];
      if (choice) setResponse(choice.value);
    }
    window.addEventListener("keydown", pickByNumber);
    return () => window.removeEventListener("keydown", pickByNumber);
  }, [question, checked]);

  if (!question) return null;
  const score = answers.filter((answer) => answer.correct).length;
  const correct = answered ? answers[index].correct : null;
  const choices = options(question);

  function mark(correct: boolean) {
    if (!question) return;
    setAnswers((current) => [...current, { questionId: question.id, correct }]);
  }

  function check(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question) return;
    if (checked) {
      next();
      return;
    }
    if (!response.trim()) return;
    setChecked(true);
    if (question.kind !== QuestionKind.ShortAnswer) mark(isRight(question, response));
  }

  function next() {
    if (index === questions.length - 1) {
      onFinish(answers);
      return;
    }
    setIndex(index + 1);
    setResponse("");
    setChecked(false);
  }

  return (
    <>
      <div className={clsx("mt-6 flex items-baseline justify-between gap-3")}>
        <Caption tone="muted">
          Question {index + 1} of {questions.length}
        </Caption>
        <Caption tone="muted" className={clsx("tabular-nums")}>
          {score} right so far
        </Caption>
      </div>
      <div className={clsx("mt-2 h-1 overflow-hidden rounded-full bg-ink/10")} aria-hidden="true">
        <div
          className={clsx("h-full bg-action transition-[width] motion-reduce:transition-none")}
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>
      <form onSubmit={check} className={clsx("mt-6 space-y-5")}>
        {question.kind === QuestionKind.ShortAnswer ? (
          <label className={clsx("block space-y-3")}>
            <SectionTitle as="span" className={clsx("block wrap-anywhere")}>
              {question.prompt}
            </SectionTitle>
            <textarea
              ref={answerField}
              value={response}
              disabled={checked}
              rows={4}
              onChange={(event) => setResponse(event.target.value)}
              placeholder="Your answer"
              className={clsx(
                "w-full rounded-md border border-ink/15 bg-transparent px-3 py-2 text-sm",
                "focus-visible:outline-2 focus-visible:outline-ink disabled:opacity-70"
              )}
            />
          </label>
        ) : (
          <fieldset className={clsx("space-y-3")} disabled={checked}>
            <legend className={clsx("mb-3")}>
              <SectionTitle as="span" className={clsx("wrap-anywhere")}>
                {question.prompt}
              </SectionTitle>
            </legend>
            <div className={clsx("divide-y divide-ink/10 rounded-md border border-ink/15")}>
              {choices.map((choice, choiceIndex) => {
                const isAnswer = checked && choice.value === question.answer;
                const isWrongPick = checked && choice.value === response && !isAnswer;
                return (
                  <label
                    key={choice.value}
                    className={clsx(
                      "flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm",
                      isAnswer && "bg-success/10",
                      isWrongPick && "bg-danger/10"
                    )}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={choice.value}
                      checked={response === choice.value}
                      onChange={() => setResponse(choice.value)}
                      className={clsx("mt-0.5 accent-current")}
                    />
                    <span className={clsx("min-w-0 flex-1 wrap-anywhere")}>{choice.label}</span>
                    <kbd className={clsx("text-xs text-muted")}>{choiceIndex + 1}</kbd>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        {checked && (
          <Feedback question={question} correct={correct} pagePath={pagePath(question.page_id)} />
        )}
        <div className={clsx("flex flex-wrap justify-end gap-2")}>
          {checked && question.kind === QuestionKind.ShortAnswer && !answered ? (
            <>
              <button type="button" onClick={() => mark(false)} className={secondaryButton}>
                I missed it
              </button>
              <button type="button" onClick={() => mark(true)} className={primaryButton}>
                I got it
              </button>
            </>
          ) : (
            <button
              ref={nextButton}
              type="submit"
              disabled={!checked && !response.trim()}
              className={primaryButton}
            >
              {!checked && "Check answer"}
              {checked && (index === questions.length - 1 ? finishLabel : "Next question")}
            </button>
          )}
        </div>
      </form>
    </>
  );
}
