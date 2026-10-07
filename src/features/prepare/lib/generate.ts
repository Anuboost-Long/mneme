import { acceptsStdin, MAX_ARGV_CONTEXT_CHARS, runOnce } from "@/features/agent-chat/lib/runTurn";
import { getAgentConnection } from "@/features/agent-chat/lib/connection/actions";
import { getActiveProfile } from "@/features/ai-profiles/lib/profile/actions";
import { kindShapes, readQuestion, text, type RawQuestion } from "@/features/quizzes/lib/generate";
import { questionKinds, type QuestionDraft } from "@/features/quizzes/lib/quiz/types";
import { readTopic } from "@/features/study/lib/generate";

import type { PageMaterial } from "./material";
import type { RevisionTopic, Term } from "./prep/types";

export const MATERIAL_BUDGET = 60_000;
export const PRACTICE_QUESTIONS = 10;
const SMALLEST_SHARE = 2_000;

const framing =
  "You are preparing revision material inside mneme, a study notes app, from the user's own course material. This is not a software task: do not read, search, or change any files on this machine, and do not use any tools.";

export type PrepDraft = { overview: string; topics: RevisionTopic[]; questions: QuestionDraft[] };

export type AgentControl = {
  onText?: (streamed: string) => void;
  onStart?: (kill: () => Promise<void>) => void;
};

export function pagesToCondense(
  pages: Pick<PageMaterial, "id" | "text">[],
  budget = MATERIAL_BUDGET
) {
  const total = pages.reduce((sum, page) => sum + page.text.length, 0);
  if (total <= budget) return { ids: [] as number[], share: budget };
  const share = Math.max(SMALLEST_SHARE, Math.floor(budget / pages.length));
  return { ids: pages.filter((page) => page.text.length > share).map((page) => page.id), share };
}

export function pageElements(pages: Pick<PageMaterial, "id" | "title" | "text">[]) {
  return pages
    .map(
      (page) =>
        `<page id="${page.id}" title="${page.title.split('"').join("'")}">\n${page.text}\n</page>`
    )
    .join("\n\n");
}

async function askAgent(
  task: string,
  content: string,
  courseId: number | undefined,
  connectionId: number | null,
  control: AgentControl = {}
) {
  const connection = await getAgentConnection(connectionId);
  if (!connection) throw new Error("No agent connected yet. Add one in Chat, then try again.");
  const viaStdin = acceptsStdin(connection);
  if (!viaStdin && content.length > MAX_ARGV_CONTEXT_CHARS)
    throw new Error(
      "This material is too long for this agent. Choose Claude or Codex as the agent."
    );
  const profile = await getActiveProfile(courseId);
  let streamed = "";
  return new Promise<string>((resolve, reject) => {
    runOnce(
      connection,
      viaStdin ? task : `${task}\n\n${content}`,
      framing,
      profile,
      (event) => {
        if (event.type === "error") reject(new Error(event.message));
        if (event.type === "text") {
          streamed += event.text;
          control.onText?.(streamed);
        }
        if (event.type === "done") resolve(event.text);
      },
      viaStdin ? content : undefined
    )
      .then(({ kill }) => control.onStart?.(kill))
      .catch(() =>
        reject(new Error(`Couldn’t start ${connection.name}. Check it’s installed and try again.`))
      );
  });
}

export async function condensePage(
  page: PageMaterial,
  share: number,
  courseId: number | undefined,
  connectionId: number | null,
  control?: AgentControl
) {
  const task = `Condense the course material in the <page> element (below, or on stdin) into study notes of at most ${share} characters. Keep every fact, term, definition, name, number, formula, date and example that matters for an exam; drop repetition, navigation and filler. Use only what the material says. Reply with only the notes, as plain text.`;
  const digest = (await askAgent(task, pageElements([page]), courseId, connectionId, control)).trim();
  if (!digest) throw new Error(`The agent didn’t condense “${page.title}”. Try again.`);
  return digest.slice(0, share * 2);
}

function readTerms(value: unknown): Term[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: { term?: unknown; definition?: unknown }) => {
    const term = text(item?.term);
    const definition = text(item?.definition);
    return term && definition ? [{ term, definition }] : [];
  });
}

function readPoints(value: unknown) {
  return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
}

type RawPrep = { overview?: unknown; topics?: unknown; questions?: unknown };

export function parsePrep(
  answer: string,
  pageIds: Set<number>,
  random: () => number = Math.random
): PrepDraft {
  const start = answer.indexOf("{");
  const end = answer.lastIndexOf("}");
  if (start === -1 || end <= start)
    throw new Error("The agent didn’t return the module’s summary and notes. Try again.");
  let parsed: RawPrep;
  try {
    parsed = JSON.parse(answer.slice(start, end + 1)) as RawPrep;
  } catch {
    throw new Error("The agent’s summary and notes couldn’t be read. Try again.");
  }
  const list = (value: unknown) =>
    Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const topics = list(parsed.topics).flatMap((item) => {
    const topic = readTopic(item, pageIds);
    return topic ? { ...topic, terms: readTerms(item.terms), points: readPoints(item.points) } : [];
  });
  const names = new Map(topics.map((topic) => [topic.name.toLowerCase(), topic.name]));
  const questions = list(parsed.questions).flatMap((item) => {
    const raw = item as RawQuestion & { topic?: unknown };
    const question = readQuestion(raw, questionKinds, pageIds, random);
    return question ? { ...question, topic: names.get(text(raw.topic).toLowerCase()) ?? null } : [];
  });
  const overview = text(parsed.overview);
  if (!overview || !topics.length)
    throw new Error("The agent didn’t write the module’s summary and topics. Try again.");
  return { overview, topics, questions: questions.slice(0, PRACTICE_QUESTIONS) };
}

export async function writePrep(
  pages: PageMaterial[],
  withQuiz: boolean,
  courseId: number | undefined,
  connectionId: number | null,
  onQuestions: (written: number) => void,
  control: AgentControl = {}
) {
  const quizPart = withQuiz
    ? ` "questions" is a practice quiz of ${PRACTICE_QUESTIONS} questions mixing multiple_choice, true_false and short_answer, covering every topic; each has a "topic" field with the exact name of the topic it tests and an explanation of one or two sentences. Multiple-choice options are all plausible, with exactly one right. Questions are shaped like:\n${questionKinds.map((kind) => kindShapes[kind].replace(', "page_id"', ', "topic": "...", "page_id"')).join("\n")}\n`
    : "";
  const shape = `{"overview": "...", "topics": [{"name": "...", "summary": "...", "page_ids": [<id>, ...], "terms": [{"term": "...", "definition": "..."}], "points": ["...", "..."]}]${withQuiz ? ', "questions": [...]' : ""}}`;
  const task = `Prepare revision material for the course module whose pages are below (or on stdin), each in its own <page> element. A page may include text read from its pictures, attached files and recordings. Use only what the material says. "overview" is a summary of the whole module in two to four paragraphs. "topics" is the 3 to 7 key topics a student must know, in a sensible study order, each with a summary of one or two sentences, the ids of the pages it comes from, its key terms with short definitions, and 3 to 6 key points worth remembering.${quizPart} Reply with only a JSON object, no other text, shaped like:\n${shape}`;
  const answer = await askAgent(task, pageElements(pages), courseId, connectionId, {
    ...control,
    onText: (streamed) =>
      onQuestions(Math.min(PRACTICE_QUESTIONS, streamed.split('"question"').length - 1))
  });
  return parsePrep(answer, new Set(pages.map((page) => page.id)));
}
