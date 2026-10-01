import { desktop } from "@chain/sdk";
import type { AiProfileRow } from "../../../shared/lib/db";
import { answerLengths, explanationLevels, languages, toggles, tones, type AnswerLength, type ExplanationLevel, type Tone } from "./preferences";

export type AiProfile = Pick<AiProfileRow, "id" | "name" | "language" | "created_at" | "updated_at"> & {
  explanationLevel: ExplanationLevel;
  tone: Tone;
  answerLength: AnswerLength;
  keepTerms: boolean;
  useExamples: boolean;
  hintsForAssessed: boolean;
};

export type ProfileInput = Omit<AiProfile, "id" | "created_at" | "updated_at">;

const defaultKey = "ai-profiles.default-id";

function fromRow(row: AiProfileRow): AiProfile {
  return {
    id: row.id,
    name: row.name,
    language: row.language,
    explanationLevel: row.explanation_level as ExplanationLevel,
    tone: row.tone as Tone,
    answerLength: row.answer_length as AnswerLength,
    keepTerms: Boolean(row.keep_terms),
    useExamples: Boolean(row.use_examples),
    hintsForAssessed: Boolean(row.hints_for_assessed),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function values(input: ProfileInput) {
  if (!input.name.trim()) throw new Error("Enter a name for the profile.");
  return [
    input.name.trim(), input.language, input.explanationLevel, input.tone, input.answerLength,
    input.keepTerms ? 1 : 0, input.useExamples ? 1 : 0, input.hintsForAssessed ? 1 : 0,
  ];
}

export async function getProfiles() {
  const rows = await desktop.storage.query<AiProfileRow>("SELECT * FROM ai_profile ORDER BY name COLLATE NOCASE, id");
  return rows.map(fromRow);
}

export async function createProfile(input: ProfileInput) {
  await desktop.storage.execute(
    "INSERT INTO ai_profile (name, language, explanation_level, tone, answer_length, keep_terms, use_examples, hints_for_assessed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    values(input),
  );
}

export async function updateProfile(id: number, input: ProfileInput) {
  await desktop.storage.execute(
    "UPDATE ai_profile SET name = ?, language = ?, explanation_level = ?, tone = ?, answer_length = ?, keep_terms = ?, use_examples = ?, hints_for_assessed = ?, updated_at = datetime('now') WHERE id = ?",
    [...values(input), id],
  );
}

export async function deleteProfile(id: number) {
  await desktop.storage.execute("UPDATE course SET ai_profile_id = NULL WHERE ai_profile_id = ?", [id]);
  await desktop.storage.execute("DELETE FROM settings WHERE key = ? AND value = ?", [defaultKey, String(id)]);
  await desktop.storage.execute("DELETE FROM ai_profile WHERE id = ?", [id]);
}

export async function getDefaultProfileId(): Promise<number | null> {
  const [row] = await desktop.storage.query<{ value: string | null }>("SELECT value FROM settings WHERE key = ?", [defaultKey]);
  const id = Number(row?.value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function setDefaultProfileId(id: number | null) {
  if (id === null) {
    await desktop.storage.execute("DELETE FROM settings WHERE key = ?", [defaultKey]);
    return;
  }
  await desktop.storage.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')", [defaultKey, String(id)]);
}

export async function getActiveProfile(courseId?: number): Promise<AiProfile | null> {
  if (courseId !== undefined) {
    const [own] = await desktop.storage.query<AiProfileRow>("SELECT ai_profile.* FROM ai_profile JOIN course ON course.ai_profile_id = ai_profile.id WHERE course.id = ?", [courseId]);
    if (own) return fromRow(own);
  }
  const defaultId = await getDefaultProfileId();
  if (defaultId === null) return null;
  const [profile] = await desktop.storage.query<AiProfileRow>("SELECT * FROM ai_profile WHERE id = ?", [defaultId]);
  return profile ? fromRow(profile) : null;
}

export function preferenceLines(profile: AiProfile) {
  const language = profile.language ? languages[profile.language] : undefined;
  return [
    language && `${language.instruction} unless the task asks for another language.`,
    explanationLevels[profile.explanationLevel]?.instruction,
    profile.keepTerms && toggles.keepTerms.instruction,
    profile.useExamples && toggles.useExamples.instruction,
    tones[profile.tone]?.instruction,
    answerLengths[profile.answerLength]?.instruction,
    profile.hintsForAssessed && toggles.hintsForAssessed.instruction,
  ].filter((line): line is string => typeof line === "string");
}

function bullets(profile: AiProfile) {
  return preferenceLines(profile).map((line) => `- ${line}`).join("\n");
}

export function withProfile(framing: string, profile: AiProfile | null) {
  if (!profile || !preferenceLines(profile).length) return framing;
  return `${framing}\n\nThe user's writing preferences, from their "${profile.name}" AI profile. Follow them in how you write; the task still decides what to produce and in what format, and wins if they conflict:\n${bullets(profile)}`;
}

export function withProfileMessage(message: string, profile: AiProfile | null) {
  if (!profile || !preferenceLines(profile).length) return message;
  return `My writing preferences, from my "${profile.name}" AI profile. Follow them in how you write; my request below still decides what to produce and in what format, and wins if they conflict:\n${bullets(profile)}\n\n---\n\n${message}`;
}
