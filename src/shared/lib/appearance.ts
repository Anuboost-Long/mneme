export type Appearance = {
  accent: "mneme" | "ocean" | "fern" | "iris" | "ochre" | "rose";
  sidebar: "narrow" | "standard" | "wide";
  pageWidth: "full" | "wide" | "readable";
  pageFont: "avenir" | "system" | "serif" | "rounded";
  textSize: "small" | "standard" | "large" | "extra-large";
  compact: boolean;
};

export const defaultAppearance: Appearance = {
  accent: "mneme",
  sidebar: "standard",
  pageWidth: "full",
  pageFont: "avenir",
  textSize: "standard",
  compact: false
};

export const accentOptions: { value: Appearance["accent"]; label: string; light: string; dark: string }[] = [
  { value: "mneme", label: "mneme", light: "#171b24", dark: "#c5f74f" },
  { value: "ocean", label: "Ocean", light: "#2f5f8a", dark: "#8ec5f0" },
  { value: "fern", label: "Fern", light: "#3f6b4a", dark: "#9fd8a8" },
  { value: "iris", label: "Iris", light: "#5f4b8b", dark: "#c3b2f0" },
  { value: "ochre", label: "Ochre", light: "#8a5a1c", dark: "#f0c27a" },
  { value: "rose", label: "Rose", light: "#9a3f5c", dark: "#f2a7bf" }
];

export const pageFontOptions = [
  { value: "avenir", label: "Avenir Next" },
  { value: "system", label: "System" },
  { value: "serif", label: "Serif" },
  { value: "rounded", label: "Rounded" }
] as const;

export const textSizeOptions = [
  { value: "small", label: "Small" },
  { value: "standard", label: "Standard" },
  { value: "large", label: "Large" },
  { value: "extra-large", label: "Extra large" }
] as const;

const KEY = "mneme.appearance";

export function readAppearance(): Appearance {
  try {
    return { ...defaultAppearance, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Appearance>) };
  } catch {
    return defaultAppearance;
  }
}

export function applyAppearance(appearance: Appearance) {
  const { dataset } = document.documentElement;
  dataset.accent = appearance.accent;
  dataset.sidebar = appearance.sidebar;
  dataset.pageWidth = appearance.pageWidth;
  dataset.pageFont = appearance.pageFont;
  dataset.textSize = appearance.textSize;
  dataset.compact = String(appearance.compact);
}

export function saveAppearance(appearance: Appearance) {
  localStorage.setItem(KEY, JSON.stringify(appearance));
}
