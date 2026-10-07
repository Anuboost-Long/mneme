import InteractiveProductShowcase from "../components/InteractiveProductShowcase";
import SiteShell from "../components/SiteShell";

export default function FeaturesPage() {
  return (
    <SiteShell>
      <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="site-frame">
          <p className="text-sm font-medium text-ink/60">Inside Mneme</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl">
            Keep learning moving, even when reading isn’t enough.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-ink/70">
            Select a feature to see it in context. The workspace and course data are a visual
            scaffold, but the interface reflects the desktop app.
          </p>
          <div className="mt-14">
            <InteractiveProductShowcase />
          </div>
          <div className="mt-10 grid gap-6 border-t border-ink/15 pt-8 md:grid-cols-3">
            <p className="text-sm leading-6 text-ink/65">
              Import course pages, PDFs, Word documents and Markdown into editable courses, modules
              and pages.
            </p>
            <p className="text-sm leading-6 text-ink/65">
              Read a selection, page or module summary aloud, with a choice of speed, language and
              system voice.
            </p>
            <p className="text-sm leading-6 text-ink/65">
              Record lectures and ideas in place, transcribe them into editable text, then clean or
              save the useful parts back into your notes.
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
