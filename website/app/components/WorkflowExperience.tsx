const steps = [
  {
    number: "01",
    title: "Bring in the material",
    description: "Course pages, PDFs, Word documents and Markdown arrive in one place.",
    label: "SOURCE"
  },
  {
    number: "02",
    title: "Make it yours",
    description: "Edit, highlight, record and extract the parts worth keeping.",
    label: "WORKSPACE"
  },
  {
    number: "03",
    title: "Ask for the next version",
    description:
      "Turn a selection or a whole module into an explanation, summary or revision notes.",
    label: "AI OUTPUT"
  },
  {
    number: "04",
    title: "Return with context",
    description: "Search, listen, reopen and continue without rebuilding the course in your head.",
    label: "RECALL"
  }
] as const;

export default function WorkflowExperience() {
  return (
    <section
      className="workflow-experience"
      aria-label="How Mneme turns course material into a learning workspace"
    >
      <header className="workflow-header">
        <div>
          <p>How it works</p>
          <h1>A course should move with you.</h1>
        </div>
        <p>
          Not from browser tab to download folder to scattered note. One course, continuously
          becoming more useful.
        </p>
      </header>
      <div className="workflow-track" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="workflow-stages">
        {steps.map((step) => (
          <article key={step.number} className="workflow-stage">
            <div className="workflow-stage-top">
              <span>{step.number}</span>
              <span>{step.label}</span>
            </div>
            <div className="workflow-symbol" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <h2>{step.title}</h2>
            <p>{step.description}</p>
          </article>
        ))}
      </div>
      <p className="workflow-caption">
        Mneme keeps the source, your thinking and the next useful output in the same course
        structure.
      </p>
    </section>
  );
}
