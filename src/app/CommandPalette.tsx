import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Caption } from "../shared/ui/Typography";
import { loadCommandGroups, type PaletteCommand } from "../shared/lib/commandSources";
import type { Course } from "../features/courses/lib/courses";
import { searchModuleLinks, type ModuleLink } from "../features/courses/lib/modules";
import type { PageLink } from "../features/courses/lib/page/types";
import { searchPageLinks } from "../features/courses/lib/page/actions";

// `path` marks a navigation item, so it can be reopened from Recent after
// the search that found it is gone.
type Item = PaletteCommand & { path?: string };

type Group = { name: string; items: Item[] };

type RecentItem = { id: string; label: string; detail?: string; path?: string };

const RECENT_KEY = "mneme.palette.recent";
const RECENT_LIMIT = 5;
const RECENT_PREFIX = "recent-";

function readRecent(): RecentItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function remember({ id, label, detail, path }: Item) {
  const original = id.startsWith(RECENT_PREFIX) ? id.slice(RECENT_PREFIX.length) : id;
  const next = [{ id: original, label, detail, path }, ...readRecent().filter((item) => item.id !== original)].slice(0, RECENT_LIMIT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { return; }
}

const places = [
  { label: "Home", path: "/" },
  { label: "Courses", path: "/courses" },
  { label: "Agent chat", path: "/agent-chat" },
  { label: "Settings", path: "/settings" },
];

const searchDelayMs = 120;

function matches(text: string, query: string) {
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

function Palette({ courses, onClose }: Readonly<{ courses: Course[]; onClose: () => void }>) {
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [commandGroups, setCommandGroups] = useState<{ group: string; commands: PaletteCommand[] }[]>([]);
  const [found, setFound] = useState<{ modules: ModuleLink[]; pages: PageLink[] }>({ modules: [], pages: [] });
  const [active, setActive] = useState(0);
  const [recent] = useState(readRecent);
  const listId = useId();

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    function closeOnBackdrop(event: MouseEvent) {
      if (event.target === element) onClose();
    }
    element.addEventListener("click", closeOnBackdrop);
    return () => { element.removeEventListener("click", closeOnBackdrop); element.close(); };
  }, [onClose]);

  useEffect(() => {
    loadCommandGroups().then(setCommandGroups, () => setCommandGroups([]));
  }, []);

  useEffect(() => {
    if (!query.trim()) { setFound({ modules: [], pages: [] }); return; }
    let current = true;
    const timer = setTimeout(() => {
      Promise.all([searchModuleLinks(query, 6), searchPageLinks(query, 8)])
        .then(([modules, pages]) => { if (current) setFound({ modules, pages }); })
        .catch(() => { if (current) setFound({ modules: [], pages: [] }); });
    }, searchDelayMs);
    return () => { current = false; clearTimeout(timer); };
  }, [query]);

  const link = (id: string, label: string, detail: string | undefined, path: string): Item => ({ id, label, detail, path, run: () => navigate(path) });
  const searching = query.trim() !== "";
  const commandItems = commandGroups.map(({ group, commands }) => ({ name: group, items: commands.filter((command) => matches(command.label, query)) }));
  const placeItems = places.filter((place) => matches(place.label, query)).map((place) => link(`go-${place.path}`, place.label, undefined, place.path));
  const available: Item[] = [...commandGroups.flatMap((group) => group.commands), ...places.map((place) => link(`go-${place.path}`, place.label, undefined, place.path))];
  const recentItems = recent.flatMap((saved): Item[] => {
    const live = available.find((item) => item.id === saved.id);
    if (live) return [{ ...live, id: RECENT_PREFIX + saved.id }];
    return saved.path ? [link(RECENT_PREFIX + saved.id, saved.label, saved.detail, saved.path)] : [];
  });
  const groups: Group[] = [
    ...(searching ? [
      { name: "Courses", items: courses.filter((course) => matches(course.name, query)).slice(0, 5).map((course) => link(`course-${course.id}`, course.name, "Course", `/courses/${course.id}`)) },
      { name: "Modules", items: found.modules.map((module) => link(`module-${module.id}`, module.name, module.course_name, `/courses/${module.course_id}/modules/${module.id}`)) },
      { name: "Pages", items: found.pages.map((page) => link(`page-${page.id}`, page.title, page.in_title ? page.module_name : `${page.module_name} · matches content`, `/courses/${page.course_id}/modules/${page.module_id}/pages/${page.id}`)) },
    ] : [{ name: "Recent", items: recentItems }]),
    ...commandItems,
    { name: "Go to", items: placeItems },
  ].filter((group) => group.items.length > 0);
  const items = groups.flatMap((group) => group.items);
  const activeIndex = Math.min(active, items.length - 1);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function run(item: Item) {
    remember(item);
    onClose();
    item.run();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!items.length) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((activeIndex + 1) % items.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((activeIndex - 1 + items.length) % items.length);
        break;
      case "Enter":
        event.preventDefault();
        run(items[activeIndex]);
        break;
    }
  }

  return (
    <dialog ref={dialog} aria-label="Search and commands" onCancel={(event) => { event.preventDefault(); onClose(); }}
      className={clsx("fixed inset-x-0 top-0 mx-auto mt-20 w-xl max-w-11/12 overflow-hidden p-0 sm:mt-28", "rounded-xl border border-ink/15 bg-surface text-ink shadow-lg", "backdrop:bg-chain-navy/40")}>
      <div className={clsx("flex items-center gap-3 border-b border-ink/10 px-4")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={clsx("shrink-0 text-muted")}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input autoFocus type="text" role="combobox" aria-expanded={items.length > 0} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={items[activeIndex] ? `${listId}-${items[activeIndex].id}` : undefined}
          aria-label="Search courses, modules, pages and commands" placeholder="Search courses, modules, pages, or run an action"
          value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleKeyDown}
          className={clsx("h-14 min-w-0 flex-1 bg-transparent text-base", "placeholder:text-muted focus:outline-none")} />
      </div>
      <div ref={list} id={listId} role="listbox" aria-label="Results" className={clsx("max-h-96 overflow-y-auto p-2")}>
        {!items.length && <Caption as="p" tone="muted" className={clsx("px-3 py-6 text-center")}>No matches for “{query.trim()}”.</Caption>}
        {groups.map((group) => (
          <div key={group.name} role="group" aria-label={group.name}>
            <Caption as="p" tone="muted" className={clsx("px-3 pt-3 pb-1")}>{group.name}</Caption>
            <ul className={clsx("m-0 list-none p-0")}>
              {group.items.map((item) => {
                const selected = item === items[activeIndex];
                return (
                  <li key={item.id} id={`${listId}-${item.id}`} role="option" aria-selected={selected}>
                    <button type="button" tabIndex={-1} onMouseMove={() => setActive(items.indexOf(item))} onClick={() => run(item)}
                      className={clsx("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm", selected && "bg-ink/7")}>
                      <span className={clsx("min-w-0 flex-1 truncate")}>{item.label}</span>
                      {item.detail && <Caption as="span" tone="muted" className={clsx("max-w-1/2 shrink-0 truncate")}>{item.detail}</Caption>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <Caption as="p" tone="muted" className={clsx("border-t border-ink/10 px-4 py-2")}>↑↓ to move · Enter to open · Esc to close</Caption>
    </dialog>
  );
}

export default function CommandPalette({ courses }: Readonly<{ courses: Course[] }>) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function toggle(event: globalThis.KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== "p") return;
      event.preventDefault();
      if (!open && document.querySelector("dialog[open]")) return;
      setOpen(!open);
    }
    window.addEventListener("keydown", toggle);
    return () => window.removeEventListener("keydown", toggle);
  }, [open]);

  return open ? <Palette courses={courses} onClose={close} /> : null;
}
