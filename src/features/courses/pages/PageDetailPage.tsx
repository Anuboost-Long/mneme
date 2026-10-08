import AudiobookBar from "@/features/audiobook/components/AudiobookBar";
import CreateAudioDialog from "@/features/audiobook/components/CreateAudioDialog";
import type { PageAudio } from "@/features/audiobook/lib/page-audio/types";
import DeletePage from "@/features/courses/components/DeletePage";
import PageEditor from "@/features/courses/components/editor/PageEditor";
import PageForm from "@/features/courses/components/PageForm";
import SiblingSwitcher, { type Sibling } from "@/features/courses/components/SiblingSwitcher";
import { StatusChip } from "@/features/courses/components/StatusPicker";
import { CompletionStatus } from "@/features/courses/lib/completion-status";
import type { Course } from "@/features/courses/lib/course/types";
import { pageTypeLabel } from "@/features/courses/lib/page-type/pageTypesState";
import { setPageDone, updatePage } from "@/features/courses/lib/page/actions";
import type { Page } from "@/features/courses/lib/page/types";
import NewQuizDialog from "@/features/quizzes/components/NewQuizDialog";
import ReadAloudBar from "@/features/read-aloud/components/ReadAloudBar";
import SharePdfButton from "@/features/share/components/SharePdfButton";
import { pageHasContent, pagePdfHtml } from "@/features/share/lib/pdf";
import { elementChunk, elementChunks } from "@/features/read-aloud/lib/readableText";
import { useReadAloud } from "@/features/read-aloud/lib/useReadAloud";
import { addCommandSource } from "@/shared/lib/commandSources";
import { errorMessage } from "@/shared/lib/errorMessage";
import { useFileUrl } from "@/shared/lib/useFileUrl";
import CourseIcon from "@/shared/ui/CourseIcon";
import { BodyText, PageTitle, Typography } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

function asSibling(page: Page): Sibling {
  return { id: page.id, name: page.title, icon: page.icon };
}

function PageSource({ source }: Readonly<{ source: string }>) {
  let host: string | null = null;
  try {
    host = /^https?:/i.test(source) ? new URL(source).hostname.replace(/^www\./, "") : null;
  } catch {
    host = null;
  }
  return (
    <Typography as="span" variant="caption" tone="muted" className={clsx("mt-2 min-w-0 truncate")}>
      From{" "}
      {host ? (
        <a
          href={source}
          target="_blank"
          rel="noopener noreferrer"
          title={source}
          className={clsx("underline underline-offset-4 hover:text-ink")}
        >
          {host}
        </a>
      ) : (
        source
      )}
    </Typography>
  );
}

export default function PageDetailPage({
  course,
  page,
  modulePages,
  pageReady,
  moduleName,
  onSavePage,
  pageAudio,
  onChangePageAudio,
  onChangeCourseProfile,
  onDeletePage
}: Readonly<{
  course: Course | undefined;
  page: Page | undefined;
  modulePages: Page[];
  pageReady: boolean;
  moduleName: string | undefined;
  onSavePage: (page: Page) => void;
  pageAudio: PageAudio | null;
  onChangePageAudio: (audio: PageAudio | null) => void;
  onChangeCourseProfile: (id: number | null) => Promise<void>;
  onDeletePage: () => void;
}>) {
  const [dialog, setDialog] = useState<"edit" | "delete" | "quiz" | null>(null);
  const [audioView, setAudioView] = useState<"closed" | "download" | "play">("closed");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [doneError, setDoneError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const backLink = useRef<HTMLAnchorElement>(null);
  const reader = useReadAloud();
  const heading = useRef<HTMLDivElement>(null);
  const coverUrl = useFileUrl(page?.cover);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowBackToTop(false);
    const link = backLink.current;
    const scrollArea = link?.closest("main");
    if (!link || !scrollArea) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowBackToTop(!entry.isIntersecting),
      { root: scrollArea }
    );
    observer.observe(link);
    return () => observer.disconnect();
  }, [page?.id, pageReady]);

  // What's on screen rather than the saved HTML, so the words and
  // sentences being read can be highlighted where they are.
  function pageChunks() {
    const title = heading.current?.querySelector("h1");
    const editor = content.current?.querySelector(".ProseMirror");
    return [
      title ? elementChunk(title) : { text: page?.title ?? "" },
      ...(editor ? elementChunks(editor) : [])
    ];
  }

  useEffect(() => setAudioView("closed"), [page?.id]);

  useEffect(() => {
    if (!page) return;
    return addCommandSource({
      group: "This page",
      load: async () => [
        {
          id: "page-make-quiz",
          label: "Make a quiz",
          detail: page.title,
          run: () => setDialog("quiz")
        }
      ]
    });
  }, [page?.id, page?.title]);

  function listen() {
    setAudioView("closed");
    reader.read(pageChunks());
  }

  function openPageAudio() {
    reader.stop();
    setAudioView(pageAudio ? "play" : "download");
  }

  function toggleDone(done: boolean) {
    if (!page) return;
    setDoneError(null);
    setPageDone(page.id, done)
      .then(onSavePage)
      .catch((error) => setDoneError(errorMessage(error, "Couldn’t update this page. Try again.")));
  }

  function scrollToTop() {
    backLink.current?.closest("main")?.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  }

  if (!course || (pageReady && !page))
    return (
      <section className={clsx("p-8 sm:p-14")}>
        <PageTitle>Page not found</PageTitle>
        <BodyText tone="muted" className={clsx("mt-3")}>
          This page may have been deleted. Choose another course from the sidebar.
        </BodyText>
        <Link
          to="/courses"
          className={clsx("mt-6 inline-block text-sm underline underline-offset-4")}
        >
          Back to all courses
        </Link>
      </section>
    );

  if (!pageReady || !page)
    return (
      <BodyText role="status" tone="muted" className={clsx("p-8")}>
        Opening this page…
      </BodyText>
    );

  return (
    <div className={clsx("px-4 py-5 sm:px-6")}>
      <Link
        ref={backLink}
        to={`/courses/${course.id}/modules/${page.module_id}`}
        className={clsx(
          "inline-flex items-center gap-2 rounded-md",
          "border border-ink/15",
          "px-3 py-2 text-sm font-medium",
          "hover:bg-ink/5"
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m12 5-7 7 7 7M5 12h14" />
        </svg>
        Back to {moduleName ?? "module"}
      </Link>
      <nav
        aria-label="Breadcrumb"
        className={clsx("mt-4 flex items-center gap-3 text-xs text-muted")}
      >
        <Link to="/courses" className={clsx("shrink-0 hover:text-ink")}>
          Your courses
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/courses/${course.id}`} className={clsx("shrink-0 truncate hover:text-ink")}>
          {course.name}
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          to={`/courses/${course.id}/modules/${page.module_id}`}
          className={clsx("shrink-0 truncate hover:text-ink")}
        >
          {moduleName ?? "Module"}
        </Link>
        <span aria-hidden="true">/</span>
        <SiblingSwitcher
          noun="page"
          color={course.color}
          siblings={modulePages.map(asSibling)}
          current={asSibling(page)}
          path={(id) => `/courses/${course.id}/modules/${page.module_id}/pages/${id}`}
        />
      </nav>
      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          className={clsx("mt-4 aspect-16/5 w-full rounded-lg object-cover")}
        />
      )}
      <div className={clsx("mt-6 flex flex-wrap items-start justify-between gap-4")}>
        <div ref={heading} className={clsx("min-w-0")}>
          <div className={clsx("flex items-center gap-4")}>
            {page.icon && <CourseIcon icon={page.icon} color={course.color} large />}
            <PageTitle className={clsx("min-w-0 wrap-anywhere")}>{page.title}</PageTitle>
          </div>
          <div className={clsx("flex flex-wrap items-center gap-3")}>
            <Typography
              as="span"
              variant="caption"
              tone="muted"
              className={clsx("mt-2 inline-block rounded-full border border-ink/15 px-2 py-0.5")}
            >
              {pageTypeLabel(page.type)}
            </Typography>
            <StatusChip
              status={page.status}
              itemLabel={page.title}
              onChange={(status) => {
                setDoneError(null);
                updatePage(page.id, {
                  status,
                  progress: status === CompletionStatus.Completed ? 100 : undefined
                })
                  .then(onSavePage)
                  .catch((error) =>
                    setDoneError(
                      errorMessage(error, "Couldn’t change this page’s status. Try again.")
                    )
                  );
              }}
            />
            {page.source && <PageSource source={page.source} />}
          </div>
        </div>
        <div className={clsx("flex gap-2")}>
          <label
            className={clsx(
              "flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
              page.status === CompletionStatus.Completed
                ? "bg-accent text-chain-navy"
                : "border border-ink/15 hover:bg-ink/5",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
            )}
          >
            <span className={clsx("relative flex size-4 shrink-0")}>
              <input
                type="checkbox"
                checked={page.status === CompletionStatus.Completed}
                onChange={(event) => toggleDone(event.target.checked)}
                className={clsx(
                  "peer size-4 cursor-pointer appearance-none rounded-sm",
                  "border border-ink/40 checked:border-chain-navy checked:bg-chain-navy"
                )}
              />
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={clsx(
                  "pointer-events-none absolute inset-0 hidden size-4 text-accent peer-checked:block"
                )}
              >
                <path d="m4 8.5 2.5 2.5L12 5.5" />
              </svg>
            </span>
            <span>Done</span>
          </label>
          {reader.supported && (
            <button
              type="button"
              onClick={listen}
              className={clsx(
                "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
                "hover:bg-ink/5"
              )}
            >
              Listen
            </button>
          )}
          <button
            type="button"
            onClick={openPageAudio}
            className={clsx(
              "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
              "hover:bg-ink/5"
            )}
          >
            {pageAudio ? "Play audio" : "Download audio"}
          </button>
          <SharePdfButton
            name={page.title}
            build={() => pagePdfHtml(page, `${course.name} · ${moduleName ?? "Module"}`)}
            disabledReason={pageHasContent(page.content) ? undefined : "This page is empty"}
            onError={setShareError}
          />
          <button
            type="button"
            onClick={() => setDialog("edit")}
            className={clsx(
              "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
              "hover:bg-ink/5"
            )}
          >
            Edit page
          </button>
          <button
            type="button"
            onClick={() => setDialog("delete")}
            className={clsx(
              "rounded-md px-3 py-2 text-sm text-muted",
              "hover:bg-danger/10 hover:text-danger"
            )}
          >
            Delete
          </button>
        </div>
      </div>
      {doneError && (
        <BodyText role="alert" tone="error" className={clsx("mt-3")}>
          {doneError}
        </BodyText>
      )}
      {shareError && (
        <BodyText role="alert" tone="error" className={clsx("mt-3")}>
          {shareError}
        </BodyText>
      )}
      <div ref={content} className={clsx("mt-6 border-t border-ink/10 pt-5")}>
        <PageEditor
          key={page.id}
          pageId={page.id}
          content={page.content}
          actionLocation={{
            courseId: course.id,
            courseName: course.name,
            moduleId: page.module_id,
            moduleName: moduleName ?? "Module",
            pageId: page.id,
            pageTitle: page.title,
            aiProfileId: course.ai_profile_id
          }}
          onChangeProfile={onChangeCourseProfile}
          onSaved={(content) => onSavePage({ ...page, content })}
          onReadAloud={reader.supported ? reader.read : undefined}
        />
      </div>
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          title="Back to top"
          className={clsx(
            "fixed right-6 z-40 flex size-10",
            reader.status === "idle" && audioView !== "play" ? "bottom-6" : "bottom-48",
            "items-center justify-center rounded-md",
            "border border-ink/15 bg-surface text-ink shadow-sm",
            "hover:bg-sidebar"
          )}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m5 14 7-7 7 7M12 7v13" />
          </svg>
        </button>
      )}
      <ReadAloudBar reader={reader} />
      <CreateAudioDialog
        open={audioView === "download"}
        pageId={page.id}
        chunks={pageChunks}
        preferredVoiceId={reader.voiceId}
        replacing={pageAudio !== null}
        onCreated={(audio) => {
          onChangePageAudio(audio);
          setAudioView("play");
        }}
        onClose={() => setAudioView(pageAudio ? "play" : "closed")}
      />
      {audioView === "play" && pageAudio && (
        <AudiobookBar
          key={pageAudio.file_reference}
          audio={pageAudio}
          chunks={pageChunks}
          onRecreate={() => setAudioView("download")}
          onDeleted={() => {
            onChangePageAudio(null);
            setAudioView("closed");
          }}
          onClose={() => setAudioView("closed")}
        />
      )}
      <PageForm
        open={dialog === "edit"}
        courseColor={course.color}
        moduleId={page.module_id}
        page={page}
        onClose={() => setDialog(null)}
        onSave={(updated) => {
          onSavePage(updated);
          setDialog(null);
        }}
      />
      <DeletePage
        open={dialog === "delete"}
        page={page}
        onClose={() => setDialog(null)}
        onDelete={onDeletePage}
      />
      <NewQuizDialog
        open={dialog === "quiz"}
        courseId={course.id}
        module={{ id: page.module_id, name: moduleName ?? "Module" }}
        pages={modulePages}
        pageId={page.id}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
