import type { AiActionRow } from "../../../../shared/lib/db/schema/ai-action";
import type { PageType } from "../../../courses/lib/page/types";

export enum ActionScope {
  Page = 1,
  Module = 2,
  Course = 3
}

export enum ActionOutput {
  Preview = 1,
  InsertBelow = 2,
  NewPage = 3
}

export type AiAction = Omit<AiActionRow, "scope" | "output" | "page_types" | "icon"> & {
  icon: string | null;
  scope: ActionScope;
  output: ActionOutput;
  pageTypes: PageType[] | null;
};

export type ActionInput = Pick<
  AiAction,
  "name" | "prompt" | "icon" | "scope" | "output" | "pageTypes"
>;
