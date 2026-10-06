import { runOnce, acceptsStdin, MAX_ARGV_CONTEXT_CHARS } from "@/features/agent-chat/lib/runTurn";
import { getActionConnection } from "@/features/ai-actions/lib/action/actions";
import { getActiveProfile } from "@/features/ai-profiles/lib/profile/actions";
import type { Page } from "@/features/courses/lib/page/types";

import type { CardDraft } from "./card/types";

const MATERIAL_CHARACTERS = 60_000;

const framing =
  "You are writing flashcards inside mneme, a study notes app, from the user's own course material. This is not a software task: do not read, search, or change any files on this machine, and do not use any tools.";

function pageText(page: Pick<Page, "content">) {
  const document = new DOMParser().parseFromString(
    `<html><body>${page.content ?? ""}</body></html>`,
    "text/html"
  );
  return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

function material(pages: Pick<Page, "id" | "title" | "content">[]) {
  const budget = Math.floor(MATERIAL_CHARACTERS / Math.max(pages.length, 1));
  return pages
    .map(
      (page) =>
        `<page id="${page.id}" title="${page.title.replace(/"/g, "'")}">\n${pageText(page).slice(0, budget)}\n</page>`
    )
    .join("\n\n");
}

export function parseCards(answer: string, pageIds: Set<number>): CardDraft[] {
  const start = answer.indexOf("[");
  const end = answer.lastIndexOf("]");
  if (start === -1 || end <= start)
    throw new Error("The agent didn’t return any flashcards. Try again.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer.slice(start, end + 1));
  } catch {
    throw new Error("The agent’s flashcards couldn’t be read. Try again.");
  }
  if (!Array.isArray(parsed)) throw new Error("The agent didn’t return any flashcards. Try again.");
  return parsed.flatMap((item) => {
    const card = item as { front?: unknown; back?: unknown; page_id?: unknown };
    const front = typeof card.front === "string" ? card.front.trim() : "";
    const back = typeof card.back === "string" ? card.back.trim() : "";
    if (!front || !back) return [];
    const pageId =
      typeof card.page_id === "number" && pageIds.has(card.page_id) ? card.page_id : null;
    return [{ front, back, page_id: pageId }];
  });
}

export async function suggestFlashcards(
  pages: Pick<Page, "id" | "title" | "content">[],
  courseId?: number
) {
  const connection = await getActionConnection();
  if (!connection) throw new Error("No agent connected yet. Add one in Chat, then try again.");
  const count = pages.length === 1 ? "8 to 15" : "15 to 30";
  const viaStdin = acceptsStdin(connection);
  const text = material(pages);
  const task = `Write ${count} flashcards for studying the course material ${viaStdin ? "provided on stdin" : "below"}, each in its own <page> element. Each card tests one fact, term, definition, cause or idea that matters for an exam: a short question or term on the front, a short, complete answer on the back. Use the material's own words and facts; don't invent anything. Reply with only a JSON array, no other text: [{"front": "...", "back": "...", "page_id": <the id of the page it comes from>}].`;
  if (!viaStdin && text.length > MAX_ARGV_CONTEXT_CHARS)
    throw new Error(
      "This material is too long for this agent. Choose Claude or Codex under Run with in the AI actions menu."
    );
  const profile = await getActiveProfile(courseId);
  return new Promise<CardDraft[]>((resolve, reject) => {
    const message = viaStdin ? task : `${task}\n\n${text}`;
    runOnce(
      connection,
      message,
      framing,
      profile,
      (event) => {
        if (event.type === "error") reject(new Error(event.message));
        if (event.type !== "done") return;
        try {
          const cards = parseCards(event.text, new Set(pages.map((page) => page.id)));
          if (cards.length === 0)
            reject(new Error("The agent didn’t return any flashcards. Try again."));
          else resolve(cards);
        } catch (error) {
          reject(error);
        }
      },
      viaStdin ? text : undefined
    ).catch(() =>
      reject(new Error(`Couldn’t start ${connection.name}. Check it’s installed and try again.`))
    );
  });
}
