import { deleteSetting, getSettingId, putSetting } from "../../../../shared/lib/settings/actions";
import {
  deleteProfileEverywhere,
  getCourseProfile,
  getProfile,
  insertProfile,
  updateProfileColumns
} from "./table";
import type { AiProfile, ProfileInput } from "./types";

export { getProfiles } from "./table";

const defaultKey = "ai-profiles.default-id";

function columns(input: ProfileInput) {
  if (!input.name.trim()) throw new Error("Enter a name for the profile.");
  return {
    name: input.name.trim(),
    language: input.language,
    explanation_level: input.explanationLevel,
    tone: input.tone,
    answer_length: input.answerLength,
    keep_terms: input.keepTerms ? 1 : 0,
    use_examples: input.useExamples ? 1 : 0,
    hints_for_assessed: input.hintsForAssessed ? 1 : 0
  };
}

export async function createProfile(input: ProfileInput) {
  await insertProfile(columns(input));
}

export async function updateProfile(id: number, input: ProfileInput) {
  await updateProfileColumns(id, columns(input));
}

export async function deleteProfile(id: number) {
  await deleteProfileEverywhere(id, defaultKey);
}

export function getDefaultProfileId() {
  return getSettingId(defaultKey);
}

export async function setDefaultProfileId(id: number | null) {
  if (id === null) await deleteSetting(defaultKey);
  else await putSetting(defaultKey, String(id));
}

export async function getActiveProfile(courseId?: number): Promise<AiProfile | null> {
  if (courseId !== undefined) {
    const own = await getCourseProfile(courseId);
    if (own) return own;
  }
  const defaultId = await getDefaultProfileId();
  return defaultId === null ? null : getProfile(defaultId);
}
