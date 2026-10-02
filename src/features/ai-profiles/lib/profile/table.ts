import { desktop, sql, type Values } from "@chain/sdk";

import type { AiProfileRow } from "../../../../shared/lib/db/schema/ai-profile";
import type { CourseRow } from "../../../../shared/lib/db/schema/course";
import type { SettingsRow } from "../../../../shared/lib/db/schema/settings";
import type { AnswerLength, ExplanationLevel, Tone } from "../preferences";
import type { AiProfile } from "./types";

const profileTable = () => desktop.storage.table<AiProfileRow>("ai_profile");

function toProfile(row: AiProfileRow): AiProfile {
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
    updated_at: row.updated_at
  };
}

export async function getProfiles() {
  const rows = await profileTable()
    .orderBy(sql`name COLLATE NOCASE`, "id")
    .all();
  return rows.map(toProfile);
}

export async function getProfile(id: number) {
  const row = await profileTable().find(id);
  return row ? toProfile(row) : null;
}

export async function getCourseProfile(courseId: number) {
  const [row] = await desktop.storage.query<AiProfileRow>(
    "SELECT ai_profile.* FROM ai_profile JOIN course ON course.ai_profile_id = ai_profile.id WHERE course.id = ?",
    [courseId]
  );
  return row ? toProfile(row) : null;
}

export async function insertProfile(values: Values<AiProfileRow> & { name: string }) {
  await profileTable().insert(values);
}

export async function updateProfileColumns(id: number, changes: Values<AiProfileRow>) {
  await profileTable().update(id, { ...changes, updated_at: sql`datetime('now')` });
}

export function deleteProfileEverywhere(id: number, defaultKey: string) {
  return desktop.storage.transaction(async (tx) => {
    await tx.table<CourseRow>("course").update({ ai_profile_id: id }, { ai_profile_id: null });
    await tx.table<SettingsRow>("settings").delete({ key: defaultKey, value: String(id) });
    await tx.table<AiProfileRow>("ai_profile").delete(id);
  });
}
