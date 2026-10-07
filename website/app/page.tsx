import Link from "next/link";

import ProductShowcase from "./components/ProductShowcase";
import SiteShell from "./components/SiteShell";

const inputs = ["Public course pages", "PDF", "Word documents", "Markdown"];
const studyModes = [
  ["Listen", "Read a page, selection, or module summary aloud."],
  ["Capture", "Record an explanation or lecture where it belongs."],
  ["Transcribe", "Turn a recording into editable text and study notes."]
] as const;

export default function HomePage() {
  return (
    <SiteShell>
      <section className="home-hero">
        <div className="site-frame home-hero-frame">
          <p className="home-kicker">Private, desktop-first course workspace</p>
          <div className="home-hero-copy">
            <h1>Take your course out of the browser.</h1>
            <p>
              Mneme turns the pages and files your course gives you into a structured library you
              can read, edit, highlight, and return to.
            </p>
            <div className="home-actions">
              <Link href="/workflow">See how it works</Link>
              <Link href="/features">Explore features</Link>
            </div>
          </div>
          <aside className="home-note">
            <p>Your library lives on your device.</p>
            <p>
              No more reconstructing a course from browser tabs, downloads, and half-finished notes.
            </p>
          </aside>
          <div className="home-workspace">
            <ProductShowcase />
          </div>
        </div>
      </section>
      <section className="home-inputs">
        <div className="site-frame">
          {inputs.map((input) => (
            <span key={input}>{input}</span>
          ))}
          <span>One course library</span>
        </div>
      </section>
      <section className="home-study-modes">
        <div className="site-frame">
          <header>
            <p>Study in more than one direction</p>
            <h2>Read it. Say it. Hear it again.</h2>
          </header>
          <div>
            {studyModes.map(([name, description]) => (
              <article key={name}>
                <h3>{name}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="home-loop">
        <div className="site-frame">
          <div>
            <h2>A place for the whole learning loop.</h2>
            <p>
              Bring in source material, turn it into your own notes, then use the same workspace to
              revisit, listen, capture and ask better questions.
            </p>
          </div>
          <Link href="/features">See everything Mneme can do</Link>
        </div>
      </section>
    </SiteShell>
  );
}
