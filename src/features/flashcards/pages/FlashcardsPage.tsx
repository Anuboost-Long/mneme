import AgentSelect from "@/features/agent-chat/components/AgentSelect";
import { useAgentChoice } from "@/features/agent-chat/lib/useAgentChoice";
import type { Course } from "@/features/courses/lib/course/types";
import type { Module } from "@/features/courses/lib/module/types";
import type { Page } from "@/features/courses/lib/page/types";
import CardForm from "@/features/flashcards/components/CardForm";
import ModuleSubpageHeader from "@/features/courses/components/ModuleSubpageHeader";
import DeckMissing from "@/features/flashcards/components/DeckMissing";
import {
  makeFlashcards,
  makesCardsForImports,
  setMakesCardsForImports,
  useMakingFlashcards
} from "@/features/flashcards/lib/autoFlashcards";
import { deckCounts, deleteCard } from "@/features/flashcards/lib/card/actions";
import type { Flashcard } from "@/features/flashcards/lib/card/types";
import { describeInterval } from "@/features/flashcards/lib/schedule";
import ConfirmDeleteDialog from "@/shared/ui/ConfirmDeleteDialog";
import { rowAction } from "@/shared/ui/rowAction";
import { BodyText, Caption, PageTitle, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type Dialog =
  { kind: "add" } | { kind: "edit"; card: Flashcard } | { kind: "delete"; card: Flashcard };

function dueLabel(card: Flashcard, now: Date) {
  if (card.last_reviewed_at === null) return "New";
  const days =
    (new Date(`${card.due_at.replace(" ", "T")}Z`).getTime() - now.getTime()) / 86_400_000;
  return days <= 0 ? "Due now" : `Due in ${describeInterval(days)}`;
}

export default function FlashcardsPage({
  course,
  module,
  pages,
  cards,
  ready,
  reload
}: Readonly<{
  course: Course | undefined;
  module: Module | undefined;
  pages: Page[];
  cards: Flashcard[];
  ready: boolean;
  reload: () => Promise<void>;
}>) {
  const [dialog, setDialog] = useState<Dialog>({ kind: "add" });
  const [open, setOpen] = useState(false);
  const [forImports, setForImports] = useState(true);
  const agent = useAgentChoice();
  const making = useMakingFlashcards(module?.id);
  const isMaking = making !== undefined && making.done < making.total;

  useEffect(() => {
    void makesCardsForImports().then(setForImports);
  }, []);

  useEffect(() => {
    if (making) void reload();
  }, [making?.done, making?.total]);

  if (!course || !module) return <DeckMissing ready={ready} />;

  const now = new Date();
  const counts = deckCounts(cards, now);
  const pagesWithCards = new Set(cards.map((card) => card.page_id));
  const pagesWithout = pages.filter((page) => !pagesWithCards.has(page.id));
  const editing = dialog.kind === "edit" ? dialog.card : null;

  function show(next: Dialog) {
    setDialog(next);
    setOpen(true);
  }

  function toggleForImports(on: boolean) {
    setForImports(on);
    void setMakesCardsForImports(on);
  }

  return (
    <div className={clsx("px-4 py-5 sm:px-6")}>
      <ModuleSubpageHeader course={course} module={module} trail={[{ label: "Flashcards" }]} />
      <div className={clsx("mt-6 flex flex-wrap items-end justify-between gap-4")}>
        <div className={clsx("min-w-0")}>
          <PageTitle className={clsx("wrap-anywhere")}>{module.name} flashcards</PageTitle>
          <BodyText tone="muted" className={clsx("mt-2")}>
            {counts.total === 0
              ? "No cards yet."
              : `${counts.due} due now · ${counts.fresh} new · ${counts.total} ${counts.total === 1 ? "card" : "cards"}`}
          </BodyText>
        </div>
        <div className={clsx("flex flex-wrap items-end gap-2")}>
          {pagesWithout.length > 0 && <AgentSelect choice={agent} className={clsx("w-44")} />}
          <button
            type="button"
            onClick={() => show({ kind: "add" })}
            className={clsx(
              "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
              "hover:bg-ink/5"
            )}
          >
            Add card
          </button>
          <button
            type="button"
            disabled={isMaking || pagesWithout.length === 0 || agent.connectionId === null}
            onClick={() =>
              void makeFlashcards(module.id, pagesWithout, course.id, {
                moduleName: module.name,
                deck: { label: "Open flashcards", path: `/courses/${course.id}/modules/${module.id}/flashcards` }
              }, agent.connectionId)
            }
            title={pagesWithout.length === 0 ? "Every page already has cards" : undefined}
            className={clsx(
              "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
              "hover:bg-ink/5 disabled:opacity-40 disabled:hover:bg-transparent"
            )}
          >
            Make flashcards
          </button>
          {counts.due > 0 && (
            <Link
              to={`/courses/${course.id}/modules/${module.id}/flashcards/review`}
              className={clsx(
                "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                "hover:bg-action/85"
              )}
            >
              Study {counts.due} {counts.due === 1 ? "card" : "cards"}
            </Link>
          )}
        </div>
      </div>
      {isMaking && (
        <div className={clsx("mt-5 space-y-2")}>
          <progress
            value={making.done}
            max={making.total}
            aria-label="Making flashcards"
            className={clsx("import-progress block h-1.5 w-full")}
          />
          <Caption role="status" tone="muted">
            Making flashcards from page {making.done + 1} of {making.total}…
          </Caption>
        </div>
      )}
      {making?.error && (
        <BodyText role="alert" tone="error" className={clsx("mt-4")}>
          {making.error}
        </BodyText>
      )}
      <label className={clsx("mt-5 flex cursor-pointer items-center gap-3 text-sm")}>
        <input
          type="checkbox"
          checked={forImports}
          onChange={(event) => toggleForImports(event.target.checked)}
          className={clsx("accent-current")}
        />
        <span>Make flashcards for pages you import</span>
      </label>
      <div className={clsx("mt-6 border-t border-ink/10")}>
        {!ready && (
          <BodyText role="status" tone="muted" className={clsx("pt-5")}>
            Loading cards…
          </BodyText>
        )}
        {ready && cards.length === 0 && (
          <div className={clsx("py-16 text-center sm:py-24")}>
            <SectionTitle>No flashcards yet</SectionTitle>
            <BodyText tone="muted" className={clsx("mx-auto mt-2 max-w-sm")}>
              {pages.length > 0
                ? "Make flashcards turns this module’s pages into cards, or add your own."
                : "Add a page to this module, then make flashcards from it, or add your own."}
            </BodyText>
          </div>
        )}
        {ready && cards.length > 0 && (
          <ul className={clsx("divide-y divide-ink/10")}>
            {cards.map((card) => (
              <li key={card.id} className={clsx("flex gap-4 py-4")}>
                <div className={clsx("min-w-0 flex-1")}>
                  <p className={clsx("text-sm font-semibold wrap-anywhere")}>{card.front}</p>
                  <BodyText tone="muted" className={clsx("mt-1 whitespace-pre-wrap wrap-anywhere")}>
                    {card.back}
                  </BodyText>
                  <Caption tone="muted" className={clsx("mt-2 flex flex-wrap gap-x-3 gap-y-1")}>
                    {card.page_id && card.page_title && (
                      <Link
                        to={`/courses/${course.id}/modules/${module.id}/pages/${card.page_id}`}
                        className={clsx(
                          "max-w-full truncate hover:text-ink hover:underline underline-offset-4"
                        )}
                      >
                        {card.page_title}
                      </Link>
                    )}
                    <span>{dueLabel(card, now)}</span>
                    {card.last_reviewed_at !== null && (
                      <span>
                        {card.right_count} right · {card.wrong_count} wrong
                      </span>
                    )}
                  </Caption>
                </div>
                <div className={clsx("flex shrink-0 items-start gap-1")}>
                  <button
                    type="button"
                    onClick={() => show({ kind: "edit", card })}
                    className={rowAction("edit")}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => show({ kind: "delete", card })}
                    className={rowAction("danger")}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <CardForm
        open={open && dialog.kind !== "delete"}
        moduleId={module.id}
        card={editing}
        pages={pages}
        onSaved={() => void reload()}
        onClose={() => setOpen(false)}
      />
      <ConfirmDeleteDialog
        open={open && dialog.kind === "delete"}
        title="Delete this card?"
        message={
          dialog.kind === "delete"
            ? `“${dialog.card.front}” and its review history are deleted for good.`
            : ""
        }
        confirmLabel="Delete card"
        failure="Couldn’t delete this card. Try again."
        onConfirm={() =>
          dialog.kind === "delete" ? deleteCard(dialog.card.id) : Promise.resolve()
        }
        onClose={() => setOpen(false)}
        onDeleted={() => {
          setOpen(false);
          void reload();
        }}
      />
    </div>
  );
}
