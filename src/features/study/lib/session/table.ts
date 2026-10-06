import type { StudySessionRow } from "@/shared/lib/db/schema/study-session";
import { desktop, sql } from "@chain/sdk";

import type { SessionResults, StudySession, Topic } from "./types";

const sessionTable = () => desktop.storage.table<StudySessionRow>("study_session");

const LIVE_SESSIONS = `SELECT study_session.id, study_session.module_id, quiz.id AS quiz_id, study_session.overview,
    study_session.topics, study_session.results, study_session.quiz_right, study_session.quiz_total,
    study_session.cards_right, study_session.cards_wrong, study_session.finished_at, study_session.created_at
  FROM study_session
  JOIN module ON module.id = study_session.module_id AND module.deleted_at IS NULL
  LEFT JOIN quiz ON quiz.id = study_session.quiz_id`;

function toSession(row: StudySessionRow): StudySession {
  return {
    ...row,
    topics: JSON.parse(row.topics) as Topic[],
    results: row.results ? (JSON.parse(row.results) as StudySession["results"]) : null
  };
}

export async function getModuleSessions(moduleId: number) {
  const rows = await desktop.storage.query<StudySessionRow>(
    `${LIVE_SESSIONS} WHERE study_session.module_id = ? ORDER BY study_session.created_at DESC, study_session.id DESC`,
    [moduleId]
  );
  return rows.map(toSession);
}

export async function getSession(id: number) {
  const [row] = await desktop.storage.query<StudySessionRow>(
    `${LIVE_SESSIONS} WHERE study_session.id = ?`,
    [id]
  );
  return row ? toSession(row) : null;
}

export async function insertSession(
  moduleId: number,
  quizId: number,
  overview: string,
  topics: Topic[]
) {
  const { id } = await sessionTable().insert({
    module_id: moduleId,
    quiz_id: quizId,
    overview,
    topics: JSON.stringify(topics)
  });
  return id;
}

export async function setResults(id: number, results: SessionResults) {
  await sessionTable().update(id, {
    results: JSON.stringify(results.topics),
    quiz_right: results.quizRight,
    quiz_total: results.quizTotal,
    cards_right: results.cardsRight,
    cards_wrong: results.cardsWrong,
    finished_at: sql`datetime('now')`
  });
}

export async function deleteSessionRow(id: number) {
  await sessionTable().delete({ id });
}

export async function deleteOrphanSessions() {
  await desktop.storage.execute(
    "DELETE FROM study_session WHERE module_id NOT IN (SELECT id FROM module)"
  );
}
