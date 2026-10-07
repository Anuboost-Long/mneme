import {
  createPage,
  getPage,
  getPages,
  reorderPages,
  updatePage
} from "@/features/courses/lib/page/actions";
import { PageType } from "@/features/courses/lib/page/types";
import { createQuiz, deleteQuiz, getQuiz } from "@/features/quizzes/lib/quiz/actions";
import type { QuestionDraft } from "@/features/quizzes/lib/quiz/types";

import { getModulePrep, setPrepColumns } from "./table";
import type { Topic } from "./types";

export {
  deleteOrphanPreps,
  getDigest,
  getFreshDigestPageIds,
  getModulePrep,
  putDigest
} from "./table";

async function keepAtTop(moduleId: number, ids: (number | null | undefined)[]) {
  const first = ids.filter((id): id is number => !!id);
  const pages = await getPages(moduleId);
  await reorderPages([
    ...first,
    ...pages.map((page) => page.id).filter((id) => !first.includes(id))
  ]);
}

async function savePrepPage(
  moduleId: number,
  existingId: number | null | undefined,
  title: string,
  type: PageType,
  content: string
) {
  const existing = existingId ? await getPage(existingId) : undefined;
  if (existing) return (await updatePage(existing.id, { content })).id;
  return (await createPage(moduleId, { title, type, content })).id;
}

export async function saveTopics(moduleId: number, topics: Topic[]) {
  await setPrepColumns(moduleId, { topics: JSON.stringify(topics) });
}

export async function saveSummary(module: { id: number; name: string }, content: string) {
  const prep = await getModulePrep(module.id);
  const id = await savePrepPage(
    module.id,
    prep?.summary_page_id,
    `Summary: ${module.name}`,
    PageType.Notes,
    content
  );
  await setPrepColumns(module.id, { summary_page_id: id });
  await keepAtTop(module.id, [id, prep?.notes_page_id]);
}

export async function saveRevisionNotes(module: { id: number; name: string }, content: string) {
  const prep = await getModulePrep(module.id);
  const id = await savePrepPage(
    module.id,
    prep?.notes_page_id,
    `Revision notes: ${module.name}`,
    PageType.Revision,
    content
  );
  await setPrepColumns(module.id, { notes_page_id: id });
  await keepAtTop(module.id, [prep?.summary_page_id, id]);
}

export async function savePracticeQuiz(
  module: { id: number; name: string },
  questions: QuestionDraft[]
) {
  const prep = await getModulePrep(module.id);
  const quizId = await createQuiz(module.id, null, `Practice quiz: ${module.name}`, questions);
  if (prep?.quiz_id && (await getQuiz(prep.quiz_id))) await deleteQuiz(prep.quiz_id);
  await setPrepColumns(module.id, { quiz_id: quizId });
}

export async function finishPrep(moduleId: number, unread: string[]) {
  await setPrepColumns(moduleId, {
    unread: JSON.stringify(unread),
    prepared_at: new Date().toISOString().replace("T", " ").slice(0, 19)
  });
}

export async function prepPageIds(moduleId: number) {
  const prep = await getModulePrep(moduleId);
  return new Set([prep?.summary_page_id, prep?.notes_page_id].filter((id): id is number => !!id));
}
