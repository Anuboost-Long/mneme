import { activityChecklist, escapeAttr, escapeHtml, findActivities } from "./import-sanitize";
import { PageType } from "./page/types";

export const CONTENT_KINDS = [
  "module",
  "lesson",
  "lecture",
  "exercise",
  "discussion",
  "assignment",
  "reading",
  "quiz",
  "resource",
  "revision",
  "notes"
] as const;

export type ContentKind = (typeof CONTENT_KINDS)[number];

export type DueDate = { text: string; date?: string };
export type LinkedFile = { name: string; url: string };

export type DetectedContent = {
  kind: ContentKind;
  sure: boolean;
  activities: string[];
  dueDates: DueDate[];
  files: LinkedFile[];
};

export const kindPageTypes: Record<ContentKind, PageType> = {
  module: PageType.Lesson,
  lesson: PageType.Lesson,
  lecture: PageType.Lecture,
  exercise: PageType.Exercise,
  discussion: PageType.Discussion,
  assignment: PageType.Assignment,
  reading: PageType.Reading,
  quiz: PageType.Exercise,
  resource: PageType.Reading,
  revision: PageType.Revision,
  notes: PageType.Notes
};

export const kindDescriptions: Record<ContentKind, string> = {
  module: "a module overview",
  lesson: "a lesson",
  lecture: "a lecture",
  exercise: "an exercise",
  discussion: "a discussion",
  assignment: "an assignment",
  reading: "a reading",
  quiz: "a quiz",
  resource: "a page of files and resources",
  revision: "revision material",
  notes: "notes"
};

const TITLE_KINDS: [RegExp, ContentKind][] = [
  [/\bdiscussion|\bforum\b/i, "discussion"],
  [/\bassignment|\bassessment|\bbrief\b|\bsubmission\b/i, "assignment"],
  [/\bquiz|\btest\b|\bexam\b|knowledge check/i, "quiz"],
  [/\blecture|\bslides\b|\brecording\b|\bwebinar\b/i, "lecture"],
  [/\bexercise|\bactivit(?:y|ies)\b|\bpractice\b|\blab\b|\bpractical\b|\btutorial\b|\bworksheet\b|\bworkshop\b/i, "exercise"],
  [/\breadings?\b|\breading list\b/i, "reading"],
  [/\bresources?\b|\bdownloads?\b|\bmaterials\b/i, "resource"],
  [/\brevision\b|\breview\b/i, "revision"],
  [/\bnotes?\b/i, "notes"],
  [/\b(?:module|week|topic|unit)\s+(?:\d+\s*)?(?:overview|outline)\b/i, "module"]
];

const CLUES: Partial<Record<ContentKind, RegExp[]>> = {
  assignment: [
    /\bsubmission\b|\bsubmit\b/i,
    /\brubric\b|\bmarking (?:criteria|guide)\b|\bassessment criteria\b/i,
    /\bweighting\b|\bword (?:count|limit)\b/i,
    /\bdue (?:date|by)\b/i,
    /\blate (?:penalt|submission)/i
  ],
  reading: [
    /\b(?:required|essential|recommended|further|core) readings?\b|\breading list\b/i,
    /\bchapters? \d+/i,
    /\bpp?\. ?\d+/i
  ],
  lecture: [/\blecture (?:slides|notes|recording|video)\b/i, /\bslides\b/i, /\brecording\b|\bwatch\b/i, /\btranscript\b/i],
  discussion: [
    /\bdiscussion (?:question|prompt|board|forum|post)s?\b/i,
    /\bpost (?:your|an initial)\b/i,
    /\b(?:reply|respond) to (?:at least|two|your peers|classmates)/i
  ],
  quiz: [/\bquiz\b/i, /\bmultiple[- ]choice\b/i, /\battempts? allowed\b|\btime limit\b/i],
  exercise: [/\bexercise\b/i, /\btry (?:this|it)\b/i, /\bworksheet\b|\bpractice\b/i]
};

const SECTION_HEADING = /^(?:week|topic|lesson|unit|session|part)\s+(?:\d+|[ivx]+|[a-z])\b/i;

function textOf(element: Element) {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

function guessKind(title: string, document: Document, files: number): { kind: ContentKind; sure: boolean } {
  const named = TITLE_KINDS.find(([pattern]) => pattern.test(title.trim()));
  if (named) return { kind: named[1], sure: true };

  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map(textOf);
  if (new Set(headings.filter((heading) => SECTION_HEADING.test(heading))).size >= 3) return { kind: "module", sure: true };
  const text = textOf(document.body);
  if (files >= 3 && text.split(" ").length < files * 40) return { kind: "resource", sure: true };

  const headingText = headings.join("\n");
  const scores = Object.entries(CLUES).map(([kind, clues]) => ({
    kind: kind as ContentKind,
    score: clues.reduce((sum, clue) => sum + (clue.test(headingText) ? 2 : Number(clue.test(text))), 0)
  }));
  scores.sort((a, b) => b.score - a.score);
  const [best, next] = scores;
  if (best.score >= 2 && best.score > (next?.score ?? 0)) return { kind: best.kind, sure: true };
  return { kind: "lesson", sure: false };
}

const DUE_WORDS = [/\bdue\b(?!\s+to\b)/i, /\bdeadline\b|\bcloses\b/i, /\bsubmit(?:ted)? by\b|\b(?:closing|submission) date\b/i];
const saysDue = (text: string) => DUE_WORDS.some((pattern) => pattern.test(text));
const DEADLINE_WORD = /\b(?:due|deadline|closes|submit(?:ted)? by)\b:?\s*/gi;
const DEADLINE_FOLLOWS = /^(?:by|on|at|week|end of)\b|^[:\d]|^(?:mon|tue|wed|thu|fri|sat|sun)/i;

function givesDeadline(line: string) {
  return Array.from(line.matchAll(DEADLINE_WORD)).some((match) =>
    DEADLINE_FOLLOWS.test(line.slice(match.index + match[0].length))
  );
}
const BLOCKS = "p, li, td, th, dt, dd, h1, h2, h3, h4, h5, h6";
const MAX_DUE_LENGTH = 200;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH = String.raw`(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?`;

function isoDate(year: number, month: number, day: number): string | undefined {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return date.toISOString().slice(0, 10);
}

function withYear(month: number, day: number, year: string | undefined, today: Date): string | undefined {
  if (year) return isoDate(Number(year.length === 2 ? `20${year}` : year), month, day);
  const thisYear = isoDate(today.getFullYear(), month, day);
  const todayIso = isoDate(today.getFullYear(), today.getMonth() + 1, today.getDate()) ?? "";
  return thisYear && thisYear < todayIso ? isoDate(today.getFullYear() + 1, month, day) : thisYear;
}

export function readDate(text: string, today: Date): string | undefined {
  const iso = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(text);
  if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dayMonth = new RegExp(String.raw`\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?${MONTH},?\s*(\d{4})?`, "i").exec(text);
  if (dayMonth) return withYear(MONTHS.indexOf(dayMonth[2].toLowerCase()) + 1, Number(dayMonth[1]), dayMonth[3], today);
  const monthDay = new RegExp(String.raw`\b${MONTH}\s+(\d{1,2})(?:st|nd|rd|th)?\b,?\s*(\d{4})?`, "i").exec(text);
  if (monthDay) return withYear(MONTHS.indexOf(monthDay[1].toLowerCase()) + 1, Number(monthDay[2]), monthDay[3], today);
  const numeric = /\b(\d{1,2})[/.](\d{1,2})[/.](\d{4}|\d{2})\b/.exec(text);
  if (numeric) return withYear(Number(numeric[2]), Number(numeric[1]), numeric[3], today);
  return undefined;
}

function dueSentence(text: string): string {
  if (text.length <= MAX_DUE_LENGTH) return text;
  const sentence = text.split(/(?<=[.!?])\s+/).find(saysDue) ?? text;
  return sentence.length <= MAX_DUE_LENGTH ? sentence : `${sentence.slice(0, MAX_DUE_LENGTH - 1)}…`;
}

function linesOf(element: Element): string[] {
  const lines = [""];
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeName === "BR") lines.push("");
      else if (child.nodeType === 3) lines[lines.length - 1] += child.textContent ?? "";
      else walk(child);
    }
  };
  walk(element);
  return lines.map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function dueLines(element: Element): string[] {
  const lines = linesOf(element);
  return lines.flatMap((line, index) => {
    if (!saysDue(line)) return [];
    const label = lines[index - 1];
    return label?.endsWith(":") && !saysDue(label) ? [`${label} ${line}`] : [line];
  });
}

function findDueDates(document: Document, today: Date): DueDate[] {
  const found = new Map<string, DueDate>();
  for (const element of Array.from(document.querySelectorAll(BLOCKS))) {
    if (element.querySelector(BLOCKS)) continue;
    for (const text of dueLines(element)) {
      const line = dueSentence(text);
      const date = readDate(line, today);
      if ((date || givesDeadline(line)) && !found.has(line)) found.set(line, { text: line, date });
    }
  }
  return [...found.values()];
}

const FILE_EXTENSIONS = new Set(
  "pdf doc docx ppt pptx xls xlsx csv rtf odt odp ods key pages numbers zip rar 7z mp3 m4a wav mp4 mov ipynb".split(" ")
);
const LMS_DOWNLOAD = /\/files\/\d+|pluginfile\.php|bbcswebdav|\/download(?:$|\/)|\/mod\/(?:resource|folder)\/view\.php/i;

const MOODLE_KIND_WORD = /\s+(?:assignment|quiz|forum|workshop|lesson|h5p|choice|feedback|file|folder)$/i;

const LINKED_ACTIVITIES: [RegExp, string][] = [
  [/\/mod\/assign\/view\.php|\/courses\/\d+\/assignments\/\d+|\/d2l\/lms\/dropbox\//i, "Assignment"],
  [/\/mod\/quiz\/view\.php|\/courses\/\d+\/quizzes\/\d+|\/d2l\/lms\/quizzing\//i, "Quiz"],
  [/\/mod\/forum\/view\.php|\/courses\/\d+\/discussion_topics\/\d+|\/d2l\/le\/\d+\/discussions\//i, "Discussion"],
  [/\/mod\/workshop\/view\.php/i, "Workshop"],
  [/\/mod\/(?:lesson|h5pactivity|scorm)\/view\.php/i, "Activity"]
];

function linkedActivities(document: Document, pageUrl: string): string[] {
  const found = new Map<string, string>();
  const page = pageUrl.split("#")[0];
  for (const link of Array.from(document.querySelectorAll("a[href]"))) {
    const href = link.getAttribute("href") ?? "";
    if (page && href.split("#")[0] === page) continue;
    const kind = LINKED_ACTIVITIES.find(([pattern]) => pattern.test(href))?.[1];
    const name = textOf(link).replace(MOODLE_KIND_WORD, "");
    if (!kind || !name || /^announcements?\b/i.test(name)) continue;
    const named = new RegExp(String.raw`^${kind}\b`, "i").test(name) ? name : `${kind}: ${name}`;
    if (!found.has(named.toLowerCase())) found.set(named.toLowerCase(), named);
  }
  return [...found.values()];
}

const ADDRESS_KINDS: [RegExp, ContentKind][] = [
  [/\/mod\/assign\/|\/courses\/\d+\/assignments\/\d+|\/d2l\/lms\/dropbox\//i, "assignment"],
  [/\/mod\/quiz\/|\/courses\/\d+\/quizzes\/\d+|\/d2l\/lms\/quizzing\//i, "quiz"],
  [/\/mod\/forum\/|\/courses\/\d+\/discussion_topics\/\d+|\/d2l\/le\/\d+\/discussions\//i, "discussion"],
  [/\/mod\/(?:resource|folder)\//i, "resource"],
  [/\/course\/view\.php|\/courses\/\d+\/?(?:modules\/?)?$|\/d2l\/home\/\d+/i, "module"]
];

function fileName(url: URL): string {
  const last = url.pathname.split("/").reverse().find(Boolean) ?? url.hostname;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

function findFiles(document: Document): LinkedFile[] {
  const found = new Map<string, LinkedFile>();
  for (const link of Array.from(document.querySelectorAll("a[href]"))) {
    let url: URL;
    try {
      url = new URL(link.getAttribute("href") ?? "");
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol)) continue;
    const isFile =
      FILE_EXTENSIONS.has(url.pathname.split(".").pop()?.toLowerCase() ?? "") || LMS_DOWNLOAD.test(url.pathname) || /[?&](?:force)?download=/i.test(url.search);
    const name = textOf(link).replace(MOODLE_KIND_WORD, "");
    if (isFile && !found.has(url.href)) found.set(url.href, { name: name || fileName(url), url: url.href });
  }
  return [...found.values()];
}

const MAX_ACTIVITIES = 30;

export function detectContent(
  title: string,
  html: string,
  { url = "", today = new Date() }: { url?: string; today?: Date } = {}
): DetectedContent {
  const document = new DOMParser().parseFromString(html, "text/html");
  const files = findFiles(document);
  const fromAddress = ADDRESS_KINDS.find(([pattern]) => pattern.test(url))?.[1];
  const activities = new Map(
    [...findActivities(html), ...linkedActivities(document, url)].map((name) => [name.toLowerCase(), name])
  );
  return {
    ...(fromAddress ? { kind: fromAddress, sure: true } : guessKind(title, document, files.length)),
    activities: [...activities.values()].slice(0, MAX_ACTIVITIES),
    dueDates: findDueDates(document, today),
    files
  };
}

export function pageOutline(title: string, html: string, length = 4000): string {
  const document = new DOMParser().parseFromString(html, "text/html");
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4")).map(textOf).filter(Boolean);
  return [`Title: ${title}`, `Headings: ${headings.join(" | ") || "none"}`, `Text: ${textOf(document.body).slice(0, length)}`].join("\n");
}

const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const formatDueDate = (date: string) => dateFormat.format(new Date(`${date}T00:00:00Z`));

export function summaryHtml({ dueDates, activities, files }: Omit<DetectedContent, "kind" | "sure">): string {
  const due = dueDates.map(({ text }) => `<li><p>${escapeHtml(text)}</p></li>`).join("");
  const links = files
    .map(({ name, url }) => `<li><p><a href="${escapeAttr(url)}">${escapeHtml(name)}</a></p></li>`)
    .join("");
  return [
    due && `<h2>Due dates</h2><ul>${due}</ul>`,
    activityChecklist(activities),
    links && `<h2>Files</h2><ul>${links}</ul>`
  ].join("");
}
