import { acceptsStdin, MAX_ARGV_CONTEXT_CHARS, runOnce } from "@/features/agent-chat/lib/runTurn";
import { getAgentConnection } from "@/features/agent-chat/lib/connection/actions";
import { getActiveProfile } from "@/features/ai-profiles/lib/profile/actions";
import type { Page } from "@/features/courses/lib/page/types";
import type { CardDraft } from "@/features/flashcards/lib/card/types";
import { material, readCard } from "@/features/flashcards/lib/generate";
import { kindShapes, readQuestion, text, type RawQuestion } from "@/features/quizzes/lib/generate";
import { questionKinds, type QuestionDraft } from "@/features/quizzes/lib/quiz/types";

import type { Topic } from "./session/types";

export const SESSION_QUESTIONS = 10;

const framing =
  "You are preparing a revision session inside mneme, a study notes app, from the user's own course material. This is not a software task: do not read, search, or change any files on this machine, and do not use any tools.";

export type SessionDraft = {
  overview: string;
  topics: Topic[];
  questions: QuestionDraft[];
  cards: CardDraft[];
};

type RawSession = {
  overview?: unknown;
  topics?: unknown;
  questions?: unknown;
  flashcards?: unknown;
};

export function readTopic(item: unknown, pageIds: Set<number>): Topic | null {
  const topic = item as { name?: unknown; summary?: unknown; page_ids?: unknown };
  const name = text(topic.name);
  const summary = text(topic.summary);
  if (!name || !summary) return null;
  const ids = Array.isArray(topic.page_ids) ? topic.page_ids : [];
  return {
    name,
    summary,
    pageIds: ids.filter((id): id is number => typeof id === "number" && pageIds.has(id))
  };
}

export function parseSession(
  answer: string,
  pageIds: Set<number>,
  random: () => number = Math.random
): SessionDraft {
  const start = answer.indexOf("{");
  const end = answer.lastIndexOf("}");
  if (start === -1 || end <= start)
    throw new Error("The agent didn’t return a study session. Try again.");
  let parsed: RawSession;
  try {
    parsed = JSON.parse(answer.slice(start, end + 1)) as RawSession;
  } catch {
    throw new Error("The agent’s study session couldn’t be read. Try again.");
  }
  const list = (value: unknown) => (Array.isArray(value) ? (value as unknown[]) : []);
  const topics = list(parsed.topics).flatMap((item) => readTopic(item, pageIds) ?? []);
  const topicNames = new Map(topics.map((topic) => [topic.name.toLowerCase(), topic.name]));
  const questions = list(parsed.questions).flatMap((item) => {
    const raw = item as RawQuestion & { topic?: unknown };
    const question = readQuestion(raw, questionKinds, pageIds, random);
    return question
      ? { ...question, topic: topicNames.get(text(raw.topic).toLowerCase()) ?? null }
      : [];
  });
  const cards = list(parsed.flashcards).flatMap((item) => readCard(item, pageIds) ?? []);
  return { overview: text(parsed.overview), topics, questions, cards };
}

export async function writeSession(
  pages: Pick<Page, "id" | "title" | "content">[],
  withCards: boolean,
  courseId: number | undefined,
  connectionId: number | null,
  onWritten: (questions: number) => void,
  knownTopics: Topic[] = []
) {
  const connection = await getAgentConnection(connectionId);
  if (!connection) throw new Error("No agent connected yet. Add one in Chat, then try again.");
  const viaStdin = acceptsStdin(connection);
  const content = material(pages);
  if (!viaStdin && content.length > MAX_ARGV_CONTEXT_CHARS)
    throw new Error(
      "This material is too long for this agent. Choose Claude or Codex as the agent."
    );
  const topicsInstruction = knownTopics.length
    ? "exactly these key topics, already chosen for this module, with the same names, summaries and page ids: " +
      JSON.stringify(
        knownTopics.map(({ name, summary, pageIds }) => ({ name, summary, page_ids: pageIds }))
      )
    : "the 3 to 7 key topics a student must know, each with a summary of one or two sentences and the ids of the pages it comes from";
  const cardsPart = withCards
    ? ` "flashcards" is 15 to 25 cards, each testing one fact, term or idea: {"front": "...", "back": "...", "page_id": <id>}.`
    : "";
  const shape = `{"overview": "...", "topics": [{"name": "...", "summary": "...", "page_ids": [<id>, ...]}], "questions": [...]${withCards ? ', "flashcards": [...]' : ""}}`;
  const task = `Prepare a revision session on the course material ${viaStdin ? "provided on stdin" : "below"}, each page in its own <page> element. Use only what the material says. "overview" is a short summary of the whole material, two or three paragraphs. "topics" is ${topicsInstruction}. "questions" is a practice quiz of ${SESSION_QUESTIONS} questions mixing multiple_choice, true_false and short_answer, covering every topic; each has a "topic" field with the exact name of the topic it tests, and an explanation of one or two sentences. Multiple-choice options are all plausible, with exactly one right. Questions are shaped like:\n${questionKinds.map((kind) => kindShapes[kind].replace(', "page_id"', ', "topic": "...", "page_id"')).join("\n")}\n${cardsPart}\nReply with only a JSON object, no other text, shaped like:\n${shape}`;
  const profile = await getActiveProfile(courseId);
  let streamed = "";
  return new Promise<SessionDraft>((resolve, reject) => {
    runOnce(
      connection,
      viaStdin ? task : `${task}\n\n${content}`,
      framing,
      profile,
      (event) => {
        if (event.type === "error") reject(new Error(event.message));
        if (event.type === "text") {
          streamed += event.text;
          onWritten(Math.min(SESSION_QUESTIONS, streamed.split('"question"').length - 1));
        }
        if (event.type !== "done") return;
        try {
          const session = parseSession(event.text, new Set(pages.map((page) => page.id)));
          if (!session.questions.length)
            reject(new Error("The agent didn’t write any questions. Try again."));
          else resolve({ ...session, questions: session.questions.slice(0, SESSION_QUESTIONS) });
        } catch (error) {
          reject(error);
        }
      },
      viaStdin ? content : undefined
    ).catch(() =>
      reject(new Error(`Couldn’t start ${connection.name}. Check it’s installed and try again.`))
    );
  });
}
