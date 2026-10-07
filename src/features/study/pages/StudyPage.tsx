import AgentSelect from "@/features/agent-chat/components/AgentSelect";
import { useAgentChoice } from "@/features/agent-chat/lib/useAgentChoice";
import ModuleSubpageHeader from "@/features/courses/components/ModuleSubpageHeader";
import type { Course } from "@/features/courses/lib/course/types";
import type { Module } from "@/features/courses/lib/module/types";
import { pageContentPreview, type Page } from "@/features/courses/lib/page/types";
import { useJobs } from "@/shared/lib/backgroundJobs";
import { timeAgo } from "@/shared/lib/date";
import ConfirmDeleteDialog from "@/shared/ui/ConfirmDeleteDialog";
import { rowAction } from "@/shared/ui/rowAction";
import { BodyText, Caption, PageTitle, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { deleteSession } from "../lib/session/actions";
import { weakTopics, type StudySession } from "../lib/session/types";
import { startStudySession, studyJobScope } from "../lib/studyJobs";

function sessionTitle(session: StudySession) {
  const names = session.topics.map((topic) => topic.name);
  return names.length > 3
    ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`
    : names.join(", ");
}

function resultLine(session: StudySession) {
  const started = timeAgo(session.created_at);
  if (!session.results) return `${started} · Not finished yet`;
  const parts = [started];
  if (session.quiz_total) parts.push(`Quiz ${session.quiz_right}/${session.quiz_total}`);
  const cards = session.cards_right + session.cards_wrong;
  if (cards) parts.push(cards === 1 ? "1 card" : `${cards} cards`);
  const weak = weakTopics(session.results).map((result) => result.topic);
  parts.push(weak.length ? "Weak: " + weak.join(", ") : "No weak topics");
  return parts.join(" · ");
}

export default function StudyPage({
  course,
  module,
  pages,
  sessions,
  ready,
  reload
}: Readonly<{
  course: Course | undefined;
  module: Module | undefined;
  pages: Page[];
  sessions: StudySession[];
  ready: boolean;
  reload: () => Promise<void>;
}>) {
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<StudySession | null>(null);
  const agent = useAgentChoice();
  const jobs = useJobs().filter((job) => module && job.scope === studyJobScope(module.id));
  const preparing = jobs.filter((job) => job.status === "running");
  const finished = jobs.length - preparing.length;

  useEffect(() => {
    if (finished) void reload();
  }, [finished, reload]);

  if (!ready)
    return (
      <BodyText role="status" tone="muted" className={clsx("p-8")}>
        Opening study sessions…
      </BodyText>
    );
  if (!course || !module)
    return (
      <section className={clsx("p-8 sm:p-14")}>
        <PageTitle>Module not found</PageTitle>
        <BodyText tone="muted" className={clsx("mt-3")}>
          This module may have been deleted. Choose another course from the sidebar.
        </BodyText>
      </section>
    );

  const sessionPath = (session: StudySession) =>
    `/courses/${course.id}/modules/${module.id}/study/${session.id}`;

  function prepare() {
    if (!course || !module) return;
    const covered = pages.filter((page) => pageContentPreview(page.content));
    if (!covered.length) {
      setError("This module’s pages have no text to study yet.");
      return;
    }
    setError("");
    startStudySession(course.id, module, covered, agent.connectionId);
  }

  return (
    <div className={clsx("px-4 py-5 sm:px-6")}>
      <ModuleSubpageHeader course={course} module={module} trail={[{ label: "Study" }]} />
      <div className={clsx("mt-6 flex flex-wrap items-end justify-between gap-4")}>
        <div className={clsx("min-w-0")}>
          <PageTitle className={clsx("wrap-anywhere")}>Study {module.name}</PageTitle>
          <BodyText tone="muted" className={clsx("mt-2")}>
            Read a summary, review your flashcards and take a quiz, then see which topics need more
            work.
          </BodyText>
        </div>
        <div className={clsx("flex flex-wrap items-end gap-3")}>
          <AgentSelect choice={agent} className={clsx("w-48")} />
          <button
            type="button"
            onClick={prepare}
            disabled={preparing.length > 0 || agent.connectionId === null}
            className={clsx(
              "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
              "hover:bg-action/85 disabled:opacity-50"
            )}
          >
            New study session
          </button>
        </div>
      </div>
      {error && (
        <BodyText role="alert" tone="error" className={clsx("mt-4")}>
          {error}
        </BodyText>
      )}
      {preparing.length > 0 && (
        <ul
          aria-label="Sessions being prepared"
          className={clsx("mt-6 divide-y divide-ink/10 border-t border-ink/10")}
        >
          {preparing.map((job) => (
            <li key={job.id} className={clsx("py-3")}>
              <p className={clsx("text-sm font-medium wrap-anywhere")}>{job.detail}</p>
              <progress
                aria-label={job.title}
                max={1}
                value={job.progress ?? undefined}
                className={clsx("import-progress mt-2 block h-1.5 w-full max-w-md")}
              />
            </li>
          ))}
        </ul>
      )}
      {sessions.length === 0 && preparing.length === 0 && (
        <div className={clsx("mt-6 border-t border-ink/10 py-16 text-center sm:py-24")}>
          <SectionTitle>No study sessions yet</SectionTitle>
          <BodyText tone="muted" className={clsx("mx-auto mt-2 max-w-sm")}>
            New study session sums up this module’s key topics and writes a quiz on them. Your due
            flashcards come along too.
          </BodyText>
        </div>
      )}
      {sessions.length > 0 && (
        <ul className={clsx("mt-6 divide-y divide-ink/10 border-t border-ink/10")}>
          {sessions.map((session) => (
            <li key={session.id} className={clsx("flex flex-wrap items-center gap-3 py-3")}>
              <div className={clsx("min-w-0 flex-1")}>
                <Link
                  to={sessionPath(session)}
                  className={clsx(
                    "text-sm font-medium wrap-anywhere hover:underline underline-offset-4"
                  )}
                >
                  {sessionTitle(session)}
                </Link>
                <Caption tone="muted" className={clsx("mt-1 block wrap-anywhere")}>
                  {resultLine(session)}
                </Caption>
              </div>
              <div className={clsx("flex shrink-0 gap-1")}>
                <Link to={sessionPath(session)} className={rowAction()}>
                  {session.results ? "See results" : "Start"}
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleting(session)}
                  className={rowAction("danger")}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDeleteDialog
        open={deleting !== null}
        title="Delete this study session?"
        message="Its summary and results are deleted for good. Its quiz stays in Quizzes."
        confirmLabel="Delete session"
        failure="Couldn’t delete this study session. Try again."
        onConfirm={() => (deleting ? deleteSession(deleting.id) : Promise.resolve())}
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          void reload();
        }}
      />
    </div>
  );
}
