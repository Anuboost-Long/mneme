import Image from "next/image";
import WorkspaceScreenshot from "./WorkspaceScreenshot";

const workflow = [
  ["01", "Bring in the material", "Import a public course page, PDF, Word document, or Markdown file."],
  ["02", "Make it navigable", "Arrange pages inside modules and courses, then keep the original structure visible while you work."],
  ["03", "Study in one place", "Edit a page, collect highlights, and use your configured AI agent to work through your own course material."],
];

function Brand() {
  return (
    <span className="flex items-center gap-3 text-lg font-semibold tracking-tight">
      <Image src="/app-icon.svg" alt="" width={36} height={36} priority />
      Mneme
    </span>
  );
}

export default function HomePage() {
  return (
    <main className="bg-paper text-ink">
      <header className="border-b border-ink/15 bg-paper px-5 sm:px-8 lg:px-12">
        <nav aria-label="Primary navigation" className="mx-auto flex h-18 max-w-7xl items-center justify-between">
          <a href="#top" aria-label="Mneme home"><Brand /></a>
          <a href="#how-it-works" className="text-sm font-medium text-ink/70 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime">
            How it works
          </a>
        </nav>
      </header>

      <section id="top" className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="max-w-xl text-sm font-medium text-ink/60">Private, desktop-first course workspace</p>
          <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-6xl lg:text-8xl">
                Take your course out of the browser.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-ink/70 sm:text-xl">
                Mneme turns the pages and files your course gives you into a structured library you can read, edit, highlight, and return to.
              </p>
              <a href="#how-it-works" className="mt-9 inline-flex border border-ink bg-ink px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-lime hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime">
                See the workflow
              </a>
            </div>
            <div className="border-l-2 border-lime pl-5 text-sm leading-6 text-ink/65">
              <p className="font-medium text-ink">Your material stays on your device.</p>
              <p className="mt-3">No more reconstructing a course from browser tabs, downloads, and half-finished notes.</p>
            </div>
          </div>
          <div className="mt-12 sm:mt-16">
            <WorkspaceScreenshot />
          </div>
        </div>
      </section>

      <section className="border-y border-ink/15 bg-ink px-5 py-5 text-paper sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-8 gap-y-2 text-sm text-paper/70">
          <span>Public course pages</span><span>PDF</span><span>Word documents</span><span>Markdown</span><span className="text-lime">One course library</span>
        </div>
      </section>

      <section id="how-it-works" className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 border-b border-ink/15 pb-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
            <div>
              <p className="text-sm font-medium text-ink/60">From scattered input to a study system</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Your reading, with a place to live.</h2>
            </div>
            <p className="text-sm leading-6 text-ink/65">Mneme preserves the course structure, then gives you tools to make the material your own.</p>
          </div>
          <ol className="divide-y divide-ink/15">
            {workflow.map(([number, title, description]) => (
              <li key={number} className="grid gap-4 py-8 sm:grid-cols-[4rem_minmax(12rem,0.7fr)_minmax(0,1fr)] sm:gap-8 sm:py-10">
                <span className="text-sm font-medium text-ink/45">{number}</span>
                <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
                <p className="max-w-xl leading-7 text-ink/70">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="bg-ink px-5 py-10 text-paper sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <Brand />
            <p className="mt-4 max-w-md text-sm leading-6 text-paper/60">A desktop workspace for making course material usable.</p>
          </div>
          <p className="text-sm text-paper/50">In active development.</p>
        </div>
      </footer>
    </main>
  );
}
