import type { Metadata } from "next";

import DownloadButton from "../components/DownloadButton";
import Reveal from "../components/Reveal";
import Screenshot, { CROPPED_HEIGHT } from "../components/Screenshot";
import SiteShell from "../components/SiteShell";

export const metadata: Metadata = { title: "How it works", description: "From a new module to ready for the exam, in three steps." };

const steps = [
  {
    title: "Bring the module in",
    body: "Drop the week’s files on a module, paste the course page’s link, or record the lecture. mneme sorts every page and turns pictures and recordings into text.",
    shot: "import",
    height: undefined,
    alt: "Importing files, a link and a recording into a module"
  },
  {
    title: "Prepare it for revision",
    body: "Choose Prepare module and pick what you need. A summary, revision notes, flashcards and a practice quiz are written from your own pages while you keep working.",
    shot: "notes",
    height: CROPPED_HEIGHT,
    alt: "Revision notes made by Prepare module, organised by topic"
  },
  {
    title: "Study until it sticks",
    body: "Review the flashcards that are due, take the quiz, and see which topics need another look. Ask the assistant whenever something doesn’t click.",
    shot: "quiz",
    height: CROPPED_HEIGHT,
    alt: "A practice quiz question with its topic"
  }
];

export default function WorkflowPage() {
  return (
    <SiteShell>
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-16 sm:px-6 lg:pt-24 lg:pb-20">
          <Reveal className="max-w-3xl">
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl">
              From a new module to ready for the exam.
            </h1>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-muted">
              The same three steps every week, in one app.
            </p>
          </Reveal>
        </div>
      </section>

      <ol className="mx-auto max-w-7xl px-4 sm:px-6">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="grid gap-8 border-b border-line py-16 last:border-b-0 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16 lg:py-24"
          >
            <Reveal className="lg:sticky lg:top-28 lg:self-start">
              <span className="flex size-10 items-center justify-center rounded-full bg-lime font-mono text-sm font-medium text-navy">
                {index + 1}
              </span>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight md:text-4xl">{step.title}</h2>
              <p className="mt-4 max-w-[40ch] text-lg leading-relaxed text-muted">{step.body}</p>
            </Reveal>
            <Reveal delay={0.1}>
              <Screenshot name={step.shot} alt={step.alt} height={step.height} sizes="(min-width: 1024px) 66vw, 100vw" />
            </Reveal>
          </li>
        ))}
      </ol>

      <section className="border-t border-line py-20 lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 sm:px-6 md:flex-row md:items-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Start with this week’s module.</h2>
          <DownloadButton />
        </div>
      </section>
    </SiteShell>
  );
}
