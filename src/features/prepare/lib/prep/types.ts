import { escapeHtml } from "@/features/ai-actions/lib/editorHtml";
import type { Topic } from "@/features/study/lib/session/types";
import type { ModulePrepRow } from "@/shared/lib/db/schema/module-prep";

export type { Topic };

export type ModulePrep = Omit<ModulePrepRow, "topics" | "unread"> & {
  topics: Topic[];
  unread: string[];
};

export type Term = { term: string; definition: string };

export type RevisionTopic = Topic & { terms: Term[]; points: string[] };

export type PrepOutput = "summary" | "notes" | "flashcards" | "quiz";

const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");

const list = (items: string[]) =>
  items.length ? `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>` : "";

export function summaryHtml(overview: string, topics: Topic[]) {
  const keyTopics = list(
    topics.map(
      (topic) => `<strong>${escapeHtml(topic.name)}</strong>: ${escapeHtml(topic.summary)}`
    )
  );
  return paragraphs(overview) + (keyTopics ? "<h2>Key topics</h2>" + keyTopics : "");
}

export function notesHtml(topics: RevisionTopic[], pageTitles: Map<number, string>) {
  return topics
    .map((topic) => {
      const sources = topic.pageIds.flatMap((id) => pageTitles.get(id) ?? []);
      const terms = list(
        topic.terms.map(
          ({ term, definition }) =>
            `<strong>${escapeHtml(term)}</strong>: ${escapeHtml(definition)}`
        )
      );
      const points = list(topic.points.map(escapeHtml));
      return [
        `<h2>${escapeHtml(topic.name)}</h2>`,
        `<p>${escapeHtml(topic.summary)}</p>`,
        terms && `<h3>Key terms</h3>${terms}`,
        points && `<h3>Key points</h3>${points}`,
        sources.length ? `<p><em>From ${escapeHtml(sources.join(", "))}</em></p>` : ""
      ].join("");
    })
    .join("");
}
