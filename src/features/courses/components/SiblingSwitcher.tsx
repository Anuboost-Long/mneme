import { hideUntilPlaced, placePopover } from "@/shared/lib/placePopover";
import CourseIcon from "@/shared/ui/CourseIcon";
import clsx from "clsx";
import { useId, useRef, type KeyboardEvent, type ToggleEvent } from "react";
import { Link } from "react-router-dom";
export type Sibling = { id: number; name: string; icon: string | null };

const stepLink = clsx(
  "grid size-6 shrink-0 place-items-center rounded-md",
  "hover:bg-ink/7 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
);

function StepIcon({ path }: Readonly<{ path: string }>) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

// The breadcrumb's last crumb: opens the other modules of the course, or
// pages of the module, with the previous and next one a click away.
export default function SiblingSwitcher({
  noun,
  color,
  siblings,
  current,
  path
}: Readonly<{
  noun: "module" | "page";
  color: string | null;
  siblings: Sibling[];
  current: Sibling;
  path: (id: number) => string;
}>) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const index = siblings.findIndex((item) => item.id === current.id);
  const previous = index > 0 ? siblings[index - 1] : undefined;
  const next = index >= 0 ? siblings[index + 1] : undefined;

  function placeMenu(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState !== "open" || !trigger.current) return;
    placePopover(event.currentTarget, trigger.current, "start");
    const links = event.currentTarget;
    (links.querySelector<HTMLElement>("[aria-current=page]") ?? links.querySelector("a"))?.focus({
      preventScroll: true
    });
  }

  function moveFocus(event: KeyboardEvent<HTMLAnchorElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const links = Array.from(menu.current?.querySelectorAll<HTMLElement>("a") ?? []);
    const current = links.indexOf(event.currentTarget);
    const step = event.key === "ArrowDown" ? 1 : -1;
    links[(current + step + links.length) % links.length]?.focus();
  }

  if (siblings.length < 2) {
    return (
      <span className={clsx("truncate")} aria-current="page">
        {current.name}
      </span>
    );
  }

  return (
    <span className={clsx("flex min-w-0 items-center gap-1")}>
      <button
        ref={trigger}
        type="button"
        popoverTarget={id}
        aria-label={`${current.name}, switch ${noun}`}
        className={clsx(
          "-mx-1 flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-ink",
          "hover:bg-ink/7 focus-visible:outline-2 focus-visible:outline-ink"
        )}
      >
        <span className={clsx("truncate")}>{current.name}</span>
        <StepIcon path="m6 9 6 6 6-6" />
      </button>
      {previous ? (
        <Link
          to={path(previous.id)}
          aria-label={`Previous ${noun}: ${previous.name}`}
          title={`Previous: ${previous.name}`}
          className={stepLink}
        >
          <StepIcon path="m15 18-6-6 6-6" />
        </Link>
      ) : (
        <span aria-hidden="true" className={clsx(stepLink, "opacity-30 hover:bg-transparent")}>
          <StepIcon path="m15 18-6-6 6-6" />
        </span>
      )}
      {next ? (
        <Link
          to={path(next.id)}
          aria-label={`Next ${noun}: ${next.name}`}
          title={`Next: ${next.name}`}
          className={stepLink}
        >
          <StepIcon path="m9 18 6-6-6-6" />
        </Link>
      ) : (
        <span aria-hidden="true" className={clsx(stepLink, "opacity-30 hover:bg-transparent")}>
          <StepIcon path="m9 18 6-6-6-6" />
        </span>
      )}
      <div
        ref={menu}
        id={id}
        popover="auto"
        aria-label={noun === "module" ? "Modules in this course" : "Pages in this module"}
        onBeforeToggle={(event) => hideUntilPlaced(event.currentTarget, event.newState)}
        onToggle={placeMenu}
        className={clsx(
          "fixed m-0 max-h-80 w-72 overflow-y-auto rounded-lg",
          "border border-ink/20 bg-surface shadow-lg",
          "p-1 text-sm text-ink"
        )}
      >
        <ul className={clsx("m-0 list-none p-0")}>
          {siblings.map((item) => (
            <li key={item.id}>
              <Link
                to={path(item.id)}
                aria-current={item.id === current.id ? "page" : undefined}
                onClick={() => menu.current?.hidePopover()}
                onKeyDown={moveFocus}
                className={clsx(
                  "flex items-center gap-3 rounded-md px-3 py-2",
                  "hover:bg-ink/7 focus-visible:bg-ink/7 focus-visible:outline-none",
                  item.id === current.id && "font-medium"
                )}
              >
                {item.icon ? (
                  <CourseIcon icon={item.icon} color={color} small />
                ) : (
                  <span aria-hidden="true" className={clsx("w-5 shrink-0")} />
                )}
                <span className={clsx("min-w-0 flex-1 truncate")}>{item.name}</span>
                {item.id === current.id && <StepIcon path="m5 12 5 5 9-10" />}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </span>
  );
}
