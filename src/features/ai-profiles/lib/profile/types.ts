import {
  answerLengths,
  explanationLevels,
  languages,
  toggles,
  tones,
  type AnswerLength,
  type ExplanationLevel,
  type Tone
} from "@/features/ai-profiles/lib/preferences";
import type { AiProfileRow } from "@/shared/lib/db/schema/ai-profile";

export type AiProfile = Pick<
  AiProfileRow,
  "id" | "name" | "language" | "created_at" | "updated_at"
> & {
  explanationLevel: ExplanationLevel;
  tone: Tone;
  answerLength: AnswerLength;
  keepTerms: boolean;
  useExamples: boolean;
  hintsForAssessed: boolean;
};

export type ProfileInput = Omit<AiProfile, "id" | "created_at" | "updated_at">;

export function preferenceLines(profile: AiProfile) {
  const language = profile.language ? languages[profile.language] : undefined;
  return [
    language && `${language.instruction} unless the task asks for another language.`,
    explanationLevels[profile.explanationLevel]?.instruction,
    profile.keepTerms && toggles.keepTerms.instruction,
    profile.useExamples && toggles.useExamples.instruction,
    tones[profile.tone]?.instruction,
    answerLengths[profile.answerLength]?.instruction,
    profile.hintsForAssessed && toggles.hintsForAssessed.instruction
  ].filter((line): line is string => typeof line === "string");
}

function bullets(profile: AiProfile) {
  return preferenceLines(profile)
    .map((line) => `- ${line}`)
    .join("\n");
}

export function withProfile(framing: string, profile: AiProfile | null) {
  if (!profile || !preferenceLines(profile).length) return framing;
  return `${framing}\n\nThe user's writing preferences, from their "${profile.name}" AI profile. Follow them in how you write; the task still decides what to produce and in what format, and wins if they conflict:\n${bullets(profile)}`;
}

export function withProfileMessage(message: string, profile: AiProfile | null) {
  if (!profile || !preferenceLines(profile).length) return message;
  return `My writing preferences, from my "${profile.name}" AI profile. Follow them in how you write; my request below still decides what to produce and in what format, and wins if they conflict:\n${bullets(profile)}\n\n---\n\n${message}`;
}
