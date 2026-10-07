import {
  CalendarCheckIcon,
  CameraIcon,
  FileDocIcon,
  FilePdfIcon,
  GlobeIcon,
  GraduationCapIcon,
  HardDrivesIcon,
  MicrophoneIcon,
  RobotIcon,
  SpeakerHighIcon,
  UserCircleIcon,
  VideoIcon
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import DownloadButton from "./components/DownloadButton";
import LaunchMark from "./components/LaunchMark";
import PrepareShowcase from "./components/PrepareShowcase";
import Reveal from "./components/Reveal";
import Screenshot, { CROPPED_HEIGHT } from "./components/Screenshot";
import SiteShell from "./components/SiteShell";

const sources = [
  { icon: GraduationCapIcon, label: "Your school’s course pages" },
  { icon: FilePdfIcon, label: "PDFs" },
  { icon: FileDocIcon, label: "Word documents and slides" },
  { icon: GlobeIcon, label: "Articles and websites" },
  { icon: CameraIcon, label: "Pictures and screenshots" },
  { icon: MicrophoneIcon, label: "Lecture recordings" },
  { icon: VideoIcon, label: "Lecture videos" }
];

const promises = [
  {
    icon: HardDrivesIcon,
    title: "Stored on your Mac",
    body: "Courses, notes, recordings and flashcards live in one library on your computer, with backups you control."
  },
  {
    icon: RobotIcon,
    title: "The AI you choose",
    body: "Use Claude, Codex, Gemini, Copilot or Cursor, pick a default, and switch for any task."
  },
  {
    icon: UserCircleIcon,
    title: "No account to make",
    body: "Download it, open it, add your first course."
  }
];

export default function HomePage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div aria-hidden className="dot-grid absolute inset-0 mask-[radial-gradient(ellipse_70%_60%_at_70%_40%,#000,transparent)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:pt-20 lg:pb-28">
          <Reveal immediate>
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl lg:text-6xl">
              Your course, ready to revise.
            </h1>
            <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-muted">
              mneme turns course pages, files and lectures into notes, flashcards and quizzes, all on
              your Mac.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <DownloadButton />
              <Link href="/features" className="text-base font-medium underline-offset-4 hover:underline">
                See every feature
              </Link>
            </div>
          </Reveal>
          <Reveal immediate delay={0.15} className="relative lg:w-[135%]">
            <div aria-hidden className="glow absolute -inset-16" />
            <Screenshot
              name="hero"
              alt="A lecture page in mneme with the assistant explaining the testing effect beside it"
              priority
              sizes="(min-width: 1024px) 80vw, 100vw"
              className="relative"
            />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="max-w-3xl">
            <h2 className="text-3xl leading-tight font-semibold tracking-tight md:text-5xl">
              Bring in everything your course gives you.
            </h2>
            <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-muted">
              Drop files on a module, paste a link or sign in to your school’s site. mneme sorts each
              page, reads text from pictures and transcribes recordings.
            </p>
          </Reveal>
          <ul className="mt-10 flex flex-wrap gap-2.5">
            {sources.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-full border border-line bg-raised px-4 py-2 text-sm"
              >
                <Icon className="size-4.5 text-muted" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
          <Reveal className="mt-12">
            <Screenshot
              name="import"
              alt="The Import dialog on a module, with files, a link and a recording ready to add"
            />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line bg-raised/50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="mb-12 max-w-3xl">
            <h2 className="text-3xl leading-tight font-semibold tracking-tight md:text-5xl">
              A whole module of revision in one go.
            </h2>
            <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-muted">
              Choose what you need and Prepare module writes it from your own pages, in the
              background while you keep working.
            </p>
          </Reveal>
          <PrepareShowcase
            shots={{
              summary: (
                <Screenshot name="summary"
                  height={CROPPED_HEIGHT} alt="A module summary written by Prepare module" />
              ),
              notes: (
                <Screenshot
                  name="notes"
                  height={CROPPED_HEIGHT}
                  alt="Revision notes with terms, definitions and key points for each topic"
                />
              ),
              flashcards: (
                <Screenshot name="flashcards"
                  height={CROPPED_HEIGHT} alt="Studying a flashcard from the module’s deck" />
              ),
              quiz: <Screenshot name="quiz"
                  height={CROPPED_HEIGHT} alt="A practice quiz question tagged by topic" />
            }}
          />
        </div>
      </section>

      <section className="border-t border-line py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="max-w-3xl">
            <h2 className="text-3xl leading-tight font-semibold tracking-tight md:text-5xl">
              Ask, search and listen.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-6">
            <Reveal className="md:col-span-4">
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-raised">
                <div className="p-7 pb-6">
                  <h3 className="text-xl font-semibold tracking-tight">Find it by what it means</h3>
                  <p className="mt-2 max-w-[48ch] leading-relaxed text-muted">
                    Press ⌘P and describe what you remember. mneme finds the page, even when you
                    don’t know the words it used.
                  </p>
                </div>
                <Screenshot
                  name="search"
                  alt="Searching for why we forget things and finding the forgetting curve page"
                  sizes="(min-width: 768px) 66vw, 100vw"
                  className="mt-auto -mb-px rounded-none border-x-0 border-b-0 shadow-none"
                />
              </article>
            </Reveal>
            <Reveal delay={0.08} className="md:col-span-2">
              <article className="relative flex h-full flex-col justify-end overflow-hidden rounded-2xl border border-line bg-navy p-7 text-cream">
                <div aria-hidden className="absolute inset-0 opacity-60 bg-[radial-gradient(circle,rgb(238_242_228/0.12)_1px,transparent_1.5px)] bg-size-[24px_24px]" />
                <SpeakerHighIcon className="relative size-10 text-lime" aria-hidden />
                <h3 className="relative mt-16 text-xl font-semibold tracking-tight">
                  Listen to any page
                </h3>
                <p className="relative mt-2 leading-relaxed text-cream/70">
                  Read a page, a selection or a module summary aloud with a voice you choose.
                </p>
              </article>
            </Reveal>
            <Reveal className="md:col-span-2">
              <article className="flex h-full flex-col justify-end rounded-2xl bg-lime p-7 text-navy">
                <CalendarCheckIcon className="size-10" aria-hidden />
                <h3 className="mt-16 text-xl font-semibold tracking-tight">Never miss a due date</h3>
                <p className="mt-2 leading-relaxed text-navy/75">
                  Assignments, quizzes and discussions become tasks, with their due dates.
                </p>
              </article>
            </Reveal>
            <Reveal delay={0.08} className="md:col-span-4">
              <article className="flex h-full flex-col justify-between gap-8 rounded-2xl border border-line bg-raised p-7 sm:flex-row sm:items-end">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">Ask about your notes</h3>
                  <p className="mt-2 max-w-[44ch] leading-relaxed text-muted">
                    The assistant answers from your own pages. In Agent mode it can make pages,
                    flashcards and tasks for you, once you allow it.
                  </p>
                </div>
                <p className="shrink-0 font-mono text-sm text-muted">
                  <kbd className="rounded-md border border-line px-2 py-1">⌘</kbd>{" "}
                  <kbd className="rounded-md border border-line px-2 py-1">P</kbd> then Ask
                </p>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-t border-line py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
          <Reveal>
            <h2 className="text-3xl leading-tight font-semibold tracking-tight md:text-5xl">
              Your notes stay yours.
            </h2>
            <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-muted">
              mneme is an app on your Mac, not a website you rent. Your library is a folder you can
              back up, move and keep.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="divide-y divide-line border-y border-line">
              {promises.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-5 py-6">
                  <Icon className="size-7 shrink-0" aria-hidden />
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                    <p className="mt-1 leading-relaxed text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-line">
        <div aria-hidden className="dot-grid absolute inset-0 mask-[radial-gradient(ellipse_55%_60%_at_50%_45%,#000,transparent)]" />
        <div aria-hidden className="glow absolute top-1/2 left-1/2 size-144 -translate-x-1/2 -translate-y-1/2" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:py-32">
          <LaunchMark />
          <h2 className="mt-10 text-3xl leading-tight font-semibold tracking-tight text-balance md:text-5xl">
            Start your next module in mneme.
          </h2>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted">
            For Mac computers with macOS 12 or later.
          </p>
          <div className="mt-9">
            <DownloadButton />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
