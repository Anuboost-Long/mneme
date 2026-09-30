import Image from "next/image";

import AppCassetteDeck, { AppDeckKey } from "./AppCassetteDeck";

export type PreviewFeature = "Read aloud" | "Recording" | "Transcription";

function Icon({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function ProductShowcase({ feature = "Transcription" }: Readonly<{ feature?: PreviewFeature }>) {
  const showRecording = feature !== "Read aloud";
  const showTranscript = feature === "Transcription";
  const showReader = feature === "Read aloud";

  return (
    <section className="app-preview" aria-label="Mneme workspace preview">
      <header className="app-preview-header">
        <div>
          <button type="button" className="app-preview-menu" aria-label="Toggle sidebar">
            <Icon><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16m7-11-3 3 3 3" /></Icon>
          </button>
          <Image src="/app-icon.svg" alt="" width={36} height={36} />
          <strong>mneme</strong>
        </div>
        <span>Learning workspace</span>
      </header>
      <div className="app-preview-body">
        <aside className="app-preview-sidebar" aria-label="Workspace navigation">
          <nav>
            <a href="#workspace" className="app-preview-nav-item"><Icon><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></Icon>Home</a>
            <a href="#workspace" className="app-preview-nav-item"><Icon><path d="M3 4h7v7H3zM14 4h7v7h-7zM3 15h7v6H3zM14 15h7v6h-7z" /></Icon>All courses</a>
            <a href="#workspace" className="app-preview-nav-item"><Icon><path d="M21 11a8 8 0 0 1-8 8H7l-4 3V11a9 9 0 0 1 18 0Z" /></Icon>Chat</a>
          </nav>
          <div className="app-preview-course-label"><span>Courses</span><span>3</span></div>
          <nav>
            <a href="#workspace" className="app-preview-course active"><b>◫</b> Secure by design</a>
            <a href="#workspace" className="app-preview-course"><b>◌</b> Psychology</a>
            <a href="#workspace" className="app-preview-course"><b>✦</b> Research methods</a>
          </nav>
          <button type="button" className="app-preview-new-course">＋ New course</button>
          <a href="#workspace" className="app-preview-settings">Settings</a>
        </aside>
        <main id="workspace" className="app-preview-main">
          <a href="#workspace" className="app-preview-back">← Back to Module 2</a>
          <nav aria-label="Breadcrumb" className="app-preview-crumbs"><span>Your courses</span><i>/</i><span>Secure by design</span><i>/</i><span>Module 2</span><i>/</i><span>Disaster recovery</span></nav>
          <div className="app-preview-title-row">
            <div><h3>Disaster recovery</h3><span>Reading</span></div>
            <div className="app-preview-actions"><button type="button"><b>✓</b> Done</button><button type="button">Listen</button><button type="button">Edit page</button><button type="button" aria-label="Delete page">Delete</button></div>
          </div>
          <article className="app-preview-editor">
            <p>Disaster recovery is the process of restoring critical systems, data and operations after a serious disruption.</p>
            <h4>Recovery priorities</h4>
            <p className={showReader ? "app-preview-reading-current" : undefined}>A good plan makes clear which services need to return first, who owns each decision, and where the team will find the information it needs.</p>
            {showRecording && <section className="app-recording-block" aria-label="Lecture recording">
              <AppCassetteDeck
                label="Lecture 3"
                recording
                timer="12:42"
                wound={0.72}
                reels="turning"
                tape={<div className="app-waveform" />}
                controls={<><AppDeckKey label="Skip back">↶</AppDeckKey><AppDeckKey label="Pause recording" primary>Ⅱ</AppDeckKey><AppDeckKey label="Skip forward">↷</AppDeckKey><span className="flex-1" /><AppDeckKey label="Volume">⌁</AppDeckKey><button type="button" className="app-recording-speed">1×</button></>}
              />
              {showTranscript && <details open className="app-transcript">
                <summary>Transcript</summary>
                <textarea aria-label="Transcript" defaultValue={"We remember more reliably when we actively retrieve an idea, rather than only rereading it. A short pause after each concept gives it a place to settle."} />
                <div><button type="button">Insert into page</button><button type="button">Transcribe again</button></div>
                <p>The inserted text is selected. Run “Clean transcript” or “Summarize” from AI actions to tidy it up.</p>
              </details>}
            </section>}
            <p>Test the plan before an incident. The rehearsal exposes gaps while there is still time to fix them.</p>
          </article>
          {showReader && <section className="app-reader" aria-label="Read aloud">
            <AppCassetteDeck
              label="Reading"
              timer="2 / 4"
              wound={0.5}
              reels="held"
              tape={<div className="app-reader-progress"><span /></div>}
              controls={<><AppDeckKey label="Previous paragraph">|◀</AppDeckKey><AppDeckKey label="Pause" primary>Ⅱ</AppDeckKey><AppDeckKey label="Next paragraph">▶|</AppDeckKey><span className="flex-1" /><button type="button" className="app-recording-speed">1× · Voice</button><AppDeckKey label="Stop reading">×</AppDeckKey></>}
            />
          </section>}
        </main>
      </div>
    </section>
  );
}
