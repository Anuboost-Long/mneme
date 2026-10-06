import { acceptsStdin, MAX_ARGV_CONTEXT_CHARS, runOnce } from "@/features/agent-chat/lib/runTurn";
import { getActionConnection } from "@/features/ai-actions/lib/action/actions";
import { getActiveProfile } from "@/features/ai-profiles/lib/profile/actions";
import type { Page } from "@/features/courses/lib/page/types";
import { material } from "@/features/flashcards/lib/generate";

import { QuestionKind, type QuestionDraft } from "./quiz/types";

const framing =
  "You are writing a practice quiz inside mneme, a study notes app, from the user's own course material. This is not a software task: do not read, search, or change any files on this machine, and do not use any tools.";

const kindNames: Record<QuestionKind, string> = {
  [QuestionKind.MultipleChoice]: "multiple_choice",
  [QuestionKind.TrueFalse]: "true_false",
  [QuestionKind.ShortAnswer]: "short_answer"
};

const kindShapes: Record<QuestionKind, string> = {
  [QuestionKind.MultipleChoice]: '{"type": "multiple_choice", "question": "...", "choices": ["...", "...", "...", "..."], "answer": <index of the right choice>, "explanation": "...", "page_id": <id>}',
  [QuestionKind.TrueFalse]: '{"type": "true_false", "question": "a statement", "answer": true or false, "explanation": "...", "page_id": <id>}',
  [QuestionKind.ShortAnswer]: '{"type": "short_answer", "question": "...", "answer": "a short model answer", "explanation": "...", "page_id": <id>}'
};

function shuffled<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

type RawQuestion = { type?: unknown; question?: unknown; choices?: unknown; answer?: unknown; explanation?: unknown; page_id?: unknown };

function readQuestion(item: RawQuestion, kinds: QuestionKind[], pageIds: Set<number>, random: () => number): QuestionDraft | null {
  const kind = kinds.find((candidate) => kindNames[candidate] === text(item.type).toLowerCase());
  const prompt = text(item.question);
  if (!kind || !prompt) return null;
  const base = {
    kind,
    prompt,
    explanation: text(item.explanation) || null,
    page_id: typeof item.page_id === "number" && pageIds.has(item.page_id) ? item.page_id : null
  };
  switch (kind) {
    case QuestionKind.MultipleChoice: {
      const choices = Array.isArray(item.choices) ? item.choices.map(text).filter(Boolean) : [];
      const right = typeof item.answer === "number" ? choices[item.answer] : undefined;
      if (choices.length < 2 || choices.length > 6 || right === undefined) return null;
      const order = shuffled(choices, random);
      return { ...base, choices: order, answer: String(order.indexOf(right)) };
    }
    case QuestionKind.TrueFalse:
      if (typeof item.answer !== "boolean") return null;
      return { ...base, choices: null, answer: String(item.answer) };
    default: {
      const answer = text(item.answer);
      return answer ? { ...base, choices: null, answer } : null;
    }
  }
}

export function parseQuestions(
  answer: string,
  kinds: QuestionKind[],
  pageIds: Set<number>,
  random: () => number = Math.random
): QuestionDraft[] {
  const start = answer.indexOf("[");
  const end = answer.lastIndexOf("]");
  if (start === -1 || end <= start) throw new Error("The agent didn’t return a quiz. Try again.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer.slice(start, end + 1));
  } catch {
    throw new Error("The agent’s quiz couldn’t be read. Try again.");
  }
  if (!Array.isArray(parsed)) throw new Error("The agent didn’t return a quiz. Try again.");
  return parsed.flatMap((item: RawQuestion) => readQuestion(item, kinds, pageIds, random) ?? []);
}

export async function writeQuiz(
  pages: Pick<Page, "id" | "title" | "content">[],
  count: number,
  kinds: QuestionKind[],
  courseId: number | undefined,
  onWritten: (questions: number) => void
) {
  const connection = await getActionConnection();
  if (!connection) throw new Error("No agent connected yet. Add one in Chat, then try again.");
  const viaStdin = acceptsStdin(connection);
  const content = material(pages);
  if (!viaStdin && content.length > MAX_ARGV_CONTEXT_CHARS)
    throw new Error("This material is too long for this agent. Choose Claude or Codex under Run with in the AI actions menu.");
  const mix = kinds.map((kind) => kindNames[kind]).join(", ");
  const task = `Write a practice quiz of ${count} questions on the course material ${viaStdin ? "provided on stdin" : "below"}, each page in its own <page> element. Mix these question types: ${mix}. Each question tests something that matters for an exam: a fact, term, cause, comparison or idea, not trivia about the page itself. Use only what the material says. Multiple-choice options are all plausible, with exactly one right. Each explanation says in one or two sentences why the answer is right. Reply with only a JSON array, no other text, of objects shaped like:\n${kinds.map((kind) => kindShapes[kind]).join("\n")}`;
  const profile = await getActiveProfile(courseId);
  let streamed = "";
  return new Promise<QuestionDraft[]>((resolve, reject) => {
    runOnce(
      connection,
      viaStdin ? task : `${task}\n\n${content}`,
      framing,
      profile,
      (event) => {
        if (event.type === "error") reject(new Error(event.message));
        if (event.type === "text") {
          streamed += event.text;
          onWritten(Math.min(count, streamed.split('"question"').length - 1));
        }
        if (event.type !== "done") return;
        try {
          const questions = parseQuestions(event.text, kinds, new Set(pages.map((page) => page.id)));
          if (questions.length) resolve(questions.slice(0, count));
          else reject(new Error("The agent didn’t write any questions. Try again."));
        } catch (error) {
          reject(error);
        }
      },
      viaStdin ? content : undefined
    ).catch(() => reject(new Error(`Couldn’t start ${connection.name}. Check it’s installed and try again.`)));
  });
}
