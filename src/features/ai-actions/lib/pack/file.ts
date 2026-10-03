import { PageType } from "../../../courses/lib/page/types";
import { actionIcons } from "../../components/ActionIcon";
import { ActionOutput, ActionScope, type ActionInput } from "../action/types";
import { PackArea, type PackContent } from "./types";

const FORMAT = "mneme-action-pack";
const VERSION = 1;
const MAX_ACTIONS = 50;

const areaWords: Record<PackArea, string> = {
  [PackArea.Study]: "study",
  [PackArea.MathsData]: "maths-data",
  [PackArea.Sciences]: "sciences",
  [PackArea.Health]: "health",
  [PackArea.Engineering]: "engineering",
  [PackArea.Humanities]: "humanities",
  [PackArea.SocialSciences]: "social-sciences",
  [PackArea.Business]: "business",
  [PackArea.Languages]: "languages",
  [PackArea.Arts]: "arts",
  [PackArea.Teaching]: "teaching"
};

const scopeWords: Record<ActionScope, string> = {
  [ActionScope.Page]: "page",
  [ActionScope.Module]: "module",
  [ActionScope.Course]: "course"
};

const outputWords: Record<ActionOutput, string> = {
  [ActionOutput.Preview]: "preview",
  [ActionOutput.InsertBelow]: "insert-below",
  [ActionOutput.NewPage]: "new-page"
};

const pageTypeWords: Record<PageType, string> = {
  [PageType.Lesson]: "lesson",
  [PageType.Lecture]: "lecture",
  [PageType.Exercise]: "exercise",
  [PageType.Discussion]: "discussion",
  [PageType.Assignment]: "assignment",
  [PageType.Notes]: "notes",
  [PageType.Reading]: "reading",
  [PageType.Revision]: "revision",
  [PageType.Custom]: "custom"
};

function fromWord<T extends number>(words: Record<T, string>, word: unknown) {
  const match = Object.entries(words).find(([, value]) => value === word);
  return match ? (Number(match[0]) as T) : null;
}

export function packFileText(pack: PackContent) {
  return JSON.stringify(
    {
      format: FORMAT,
      version: VERSION,
      name: pack.name,
      description: pack.description,
      area: pack.area ? areaWords[pack.area] : null,
      actions: pack.actions.map((action) => ({
        name: action.name,
        icon: action.icon,
        prompt: action.prompt,
        scope: scopeWords[action.scope],
        output: outputWords[action.output],
        pageTypes: action.pageTypes?.map((type) => pageTypeWords[type]) ?? null
      }))
    },
    null,
    2
  );
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readAction(value: unknown, index: number): ActionInput {
  const action = (value ?? {}) as Record<string, unknown>;
  const name = text(action.name);
  const label = name ? `“${name}”` : `Action ${index + 1}`;
  if (!name) throw new Error(`${label} in this pack has no name.`);
  const prompt = text(action.prompt);
  if (!prompt) throw new Error(`${label} in this pack has no instructions.`);
  const icon = text(action.icon);
  const pageTypes = Array.isArray(action.pageTypes)
    ? action.pageTypes.flatMap((word) => fromWord(pageTypeWords, word) ?? [])
    : [];
  return {
    name,
    prompt,
    icon: actionIcons.includes(icon) ? icon : null,
    scope: fromWord(scopeWords, action.scope) ?? ActionScope.Page,
    output: fromWord(outputWords, action.output) ?? ActionOutput.Preview,
    pageTypes: pageTypes.length ? pageTypes : null
  };
}

export function readPackFile(content: string): PackContent {
  let file: Record<string, unknown>;
  try {
    file = JSON.parse(content) as Record<string, unknown>;
  } catch {
    file = {};
  }
  if (file?.format !== FORMAT) throw new Error("This file isn’t a mneme action pack.");
  if (typeof file.version !== "number" || file.version > VERSION)
    throw new Error("This pack needs a newer version of mneme.");
  const name = text(file.name);
  if (!name) throw new Error("This pack has no name.");
  if (!Array.isArray(file.actions) || file.actions.length === 0)
    throw new Error("This pack has no actions.");
  if (file.actions.length > MAX_ACTIONS)
    throw new Error(`This pack has more than ${MAX_ACTIONS} actions.`);
  return {
    name,
    description: text(file.description),
    area: fromWord(areaWords, file.area),
    actions: file.actions.map(readAction)
  };
}
