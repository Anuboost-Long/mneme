import type { Module } from "@/features/courses/lib/module/types";
import { getPages } from "@/features/courses/lib/page/actions";
import type { Page } from "@/features/courses/lib/page/types";
import { addCards, getDeckCards } from "@/features/flashcards/lib/card/actions";
import { suggestFlashcards } from "@/features/flashcards/lib/generate";
import { startJob } from "@/shared/lib/backgroundJobs";
import { errorMessage } from "@/shared/lib/errorMessage";

import {
  condensePage,
  pagesToCondense,
  PRACTICE_QUESTIONS,
  writePrep,
  type AgentControl
} from "./generate";
import { fingerprint, htmlText, readMaterial, type PageMaterial } from "./material";
import {
  finishPrep,
  getDigest,
  prepPageIds,
  putDigest,
  savePracticeQuiz,
  saveRevisionNotes,
  saveSummary,
  saveTopics
} from "./prep/actions";
import { notesHtml, summaryHtml, type PrepOutput } from "./prep/types";

export const prepJobScope = (moduleId: number) => `prepare:${moduleId}`;

const MIN_CARD_TEXT = 80;

export function pagesNeedingCards(pages: Page[], cardPageIds: Set<number | null>) {
  return pages.filter(
    (page) => !cardPageIds.has(page.id) && htmlText(page.content ?? "").length > MIN_CARD_TEXT
  );
}

export function estimateRuns(
  pages: Page[],
  outputs: PrepOutput[],
  cardPages: number,
  condensed = new Set<number>()
) {
  const writes = outputs.some((output) => output !== "flashcards");
  const toCondense = pagesToCondense(
    pages.map((page) => ({ id: page.id, text: htmlText(page.content ?? "") }))
  ).ids;
  const condensing = writes ? toCondense.filter((id) => !condensed.has(id)).length : 0;
  return (writes ? 1 + condensing : 0) + (outputs.includes("flashcards") ? cardPages : 0);
}

async function fitMaterial(
  pages: PageMaterial[],
  courseId: number,
  connectionId: number | null,
  onCondensing: (page: PageMaterial, index: number, total: number) => void,
  control: AgentControl,
  stopped: () => boolean
) {
  const { ids, share } = pagesToCondense(pages);
  const fitted: PageMaterial[] = [];
  for (const page of pages) {
    if (stopped()) break;
    if (!ids.includes(page.id)) {
      fitted.push(page);
      continue;
    }
    const hash = fingerprint(page.text);
    let digest = await getDigest(page.id, hash);
    if (!digest) {
      onCondensing(page, ids.indexOf(page.id), ids.length);
      digest = await condensePage(page, share, courseId, connectionId, control);
      await putDigest(page.id, hash, digest);
    }
    fitted.push({ ...page, text: digest });
  }
  return fitted;
}

export function startPrepare(
  courseId: number,
  module: Pick<Module, "id" | "name">,
  outputs: PrepOutput[],
  connectionId: number | null
) {
  let stopped = false;
  let kill: (() => Promise<void>) | null = null;
  const control: AgentControl = { onStart: (stop) => (kill = stop) };
  const job = startJob(prepJobScope(module.id), `Preparing ${module.name}`, "Starting", () => {
    stopped = true;
    void kill?.();
  });
  const made: string[] = [];
  const isStopped = () => stopped;

  async function write(pages: Page[]) {
    const material = await readMaterial(
      pages,
      (detail, done, total) => job.update(detail, (done / total) * 0.3),
      isStopped
    );
    if (stopped) return material.unread;
    if (!material.pages.length)
      throw new Error("This module’s pages have no text to prepare from yet.");
    const fitted = await fitMaterial(
      material.pages,
      courseId,
      connectionId,
      (page, index, total) =>
        job.update(
          `Condensing “${page.title}” · ${index + 1} of ${total}`,
          0.3 + (index / total) * 0.2
        ),
      control,
      isStopped
    );
    if (stopped) return material.unread;
    job.update("Writing the summary and notes", 0.5);
    const draft = await writePrep(
      fitted,
      outputs.includes("quiz"),
      courseId,
      connectionId,
      (written) => {
        if (written > 0)
          job.update(
            `Writing the practice quiz · ${written} of ${PRACTICE_QUESTIONS} questions`,
            0.5 + (written / PRACTICE_QUESTIONS) * 0.2
          );
      },
      control
    );
    await saveTopics(
      module.id,
      draft.topics.map(({ name, summary, pageIds }) => ({ name, summary, pageIds }))
    );
    if (outputs.includes("summary")) {
      await saveSummary(module, summaryHtml(draft.overview, draft.topics));
      made.push("summary");
    }
    if (outputs.includes("notes")) {
      await saveRevisionNotes(
        module,
        notesHtml(draft.topics, new Map(pages.map((page) => [page.id, page.title])))
      );
      made.push("revision notes");
    }
    if (outputs.includes("quiz") && draft.questions.length) {
      await savePracticeQuiz(module, draft.questions);
      made.push("practice quiz");
    }
    return material.unread;
  }

  async function makeCards(pages: Page[]) {
    const cards = await getDeckCards(module.id);
    const needing = pagesNeedingCards(pages, new Set(cards.map((card) => card.page_id)));
    let added = 0;
    for (const [index, page] of needing.entries()) {
      if (stopped) break;
      job.update(
        `Making flashcards · page ${index + 1} of ${needing.length}`,
        0.75 + (index / needing.length) * 0.25
      );
      const drafts = await suggestFlashcards([page], courseId, connectionId);
      await addCards(module.id, drafts);
      added += drafts.length;
    }
    if (added) made.push(`${added} flashcards`);
  }

  void (async () => {
    let unread: string[] = [];
    try {
      const skip = await prepPageIds(module.id);
      const pages = (await getPages(module.id)).filter((page) => !skip.has(page.id));
      if (outputs.some((output) => output !== "flashcards")) unread = await write(pages);
      if (outputs.includes("flashcards") && !stopped) await makeCards(pages);
      if (made.length) await finishPrep(module.id, unread);
      job.finish(
        stopped ? `Stopped preparing ${module.name}` : `${module.name} is prepared`,
        made.length ? `Made: ${made.join(", ")}` : "Nothing was made",
        { label: "Open", path: `/courses/${courseId}/modules/${module.id}/prepare` }
      );
    } catch (error) {
      if (stopped) {
        if (made.length) await finishPrep(module.id, unread).catch(() => undefined);
        job.finish(
          `Stopped preparing ${module.name}`,
          made.length ? `Made: ${made.join(", ")}` : "Nothing was made"
        );
      } else
        job.fail(
          `Couldn’t prepare ${module.name}`,
          errorMessage(error, "Try again from Prepare module.")
        );
    }
  })();
}
