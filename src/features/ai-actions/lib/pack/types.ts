import type { ActionPackRow } from "../../../../shared/lib/db/schema/action-pack";
import type { ActionInput } from "../action/types";

export enum PackArea {
  Study = 1,
  MathsData = 2,
  Sciences = 3,
  Health = 4,
  Engineering = 5,
  Humanities = 6,
  SocialSciences = 7,
  Business = 8,
  Languages = 9,
  Arts = 10,
  Teaching = 11
}

export const packAreaLabels: Record<PackArea, string> = {
  [PackArea.Study]: "Study skills",
  [PackArea.MathsData]: "Maths and data",
  [PackArea.Sciences]: "Natural sciences",
  [PackArea.Health]: "Health",
  [PackArea.Engineering]: "Engineering and technology",
  [PackArea.Humanities]: "Humanities",
  [PackArea.SocialSciences]: "Social sciences",
  [PackArea.Business]: "Business",
  [PackArea.Languages]: "Languages, writing and research",
  [PackArea.Arts]: "Arts",
  [PackArea.Teaching]: "Teaching"
};

export type ActionPack = Omit<ActionPackRow, "catalog_key" | "area"> & {
  catalogKey: string | null;
  area: PackArea | null;
};

export type PackContent = {
  name: string;
  description: string;
  area: PackArea | null;
  actions: ActionInput[];
};

export type CatalogPack = PackContent & { key: string; icon: string; area: PackArea };
