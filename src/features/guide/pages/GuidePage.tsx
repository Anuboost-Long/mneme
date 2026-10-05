import clsx from "clsx";
import { Link, NavLink } from "react-router-dom";

import { BodyText, PageTitle, SectionTitle, Typography } from "../../../shared/ui/Typography";
import { guideTopics, type GuideTopic } from "../lib/topics";

export default function GuidePage({ topic }: Readonly<{ topic: GuideTopic }>) {
  return (
    <div className={clsx("@container w-full px-4 py-5 sm:px-6")}>
      <Link
        to="/"
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
        Back to home
      </Link>
      <PageTitle className={clsx("mt-6")}>Guide</PageTitle>
      <div className={clsx("mt-6 flex flex-col gap-6 @min-3xl:flex-row @min-3xl:items-start")}>
        <nav
          aria-label="Guide topics"
          className={clsx(
            "-mx-1 overflow-x-auto @min-3xl:sticky @min-3xl:top-5 @min-3xl:mx-0 @min-3xl:w-44 @min-3xl:shrink-0"
          )}
        >
          <ul className={clsx("flex gap-1 px-1 @min-3xl:flex-col @min-3xl:px-0")}>
            {guideTopics.map((item) => (
              <li key={item.id} className={clsx("shrink-0")}>
                <NavLink
                  to={`/guide/${item.id}`}
                  className={({ isActive }) =>
                    clsx(
                      "block rounded-md px-3 py-2 text-sm whitespace-nowrap",
                      "focus-visible:outline-2 focus-visible:outline-ink",
                      isActive ? "bg-ink/7 font-medium text-ink" : "text-muted hover:bg-ink/5 hover:text-ink"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <article aria-labelledby="guide-topic-title" className={clsx("@container min-w-0 flex-1")}>
          <header className={clsx("grid gap-6 pb-6 @min-3xl:grid-cols-3")}>
            <div>
              <SectionTitle id="guide-topic-title">{topic.title}</SectionTitle>
              <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>
                {topic.summary}
              </BodyText>
            </div>
            <div className={clsx("min-w-0 max-w-xl @min-3xl:col-span-2")}>
              <Typography as="p" variant="label">
                Where to find it
              </Typography>
              <BodyText className={clsx("mt-1")}>{topic.where}</BodyText>
              {topic.place && (
                <Link
                  to={topic.place.path}
                  className={clsx(
                    "mt-4 inline-flex h-11 items-center rounded-md px-4 text-sm font-medium",
                    "border border-ink/15",
                    "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  )}
                >
                  {topic.place.label}
                </Link>
              )}
            </div>
          </header>
          <ol>
            {topic.steps.map((step, index) => (
              <li
                key={step.title}
                className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}
              >
                <div className={clsx(step.screenshots.length === 0 && "@min-3xl:col-span-3")}>
                  <Typography as="p" variant="caption" tone="muted">
                    Step {index + 1}
                  </Typography>
                  <SectionTitle as="h3" className={clsx("mt-1")}>
                    {step.title}
                  </SectionTitle>
                  <div className={clsx("mt-2 space-y-2", step.screenshots.length > 0 ? "max-w-xs" : "max-w-2xl")}>
                    {step.body.map((paragraph) => (
                      <BodyText key={paragraph} tone="muted">
                        {paragraph}
                      </BodyText>
                    ))}
                  </div>
                </div>
                {step.screenshots.length > 0 && (
                  <div
                    className={clsx(
                      "grid min-w-0 gap-4 @min-3xl:col-span-2",
                      step.screenshots.length > 1 && !step.screenshots[0].landscape && "max-w-xl grid-cols-2",
                      step.screenshots.length > 1 && step.screenshots[0].landscape && "max-w-xl",
                      step.screenshots.length === 1 && (step.screenshots[0].landscape ? "max-w-xl" : "max-w-xs")
                    )}
                  >
                    {step.screenshots.map((screenshot) => (
                      <img
                        key={screenshot.src}
                        src={screenshot.src}
                        alt={screenshot.alt}
                        loading="lazy"
                        className={clsx("w-full rounded-md border border-ink/15")}
                      />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </article>
      </div>
    </div>
  );
}
