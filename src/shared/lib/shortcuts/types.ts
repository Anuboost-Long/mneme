export const shortcuts = [
  { id: "command-palette", label: "Open the command palette", combo: "Mod+P" },
  { id: "new-page", label: "New page in this module", combo: "Mod+N" },
  { id: "find-in-page", label: "Find in page", combo: "Mod+F" },
  { id: "save-page", label: "Save the page now", combo: "Mod+S" },
  { id: "toggle-sidebar", label: "Show or hide the sidebar", combo: "Mod+\\" },
  { id: "toggle-agent-chat", label: "Show or hide agent chat", combo: "Mod+Shift+A" },
  { id: "open-settings", label: "Open settings", combo: "Mod+," }
] as const;

export type ShortcutId = (typeof shortcuts)[number]["id"];

export type Bindings = Record<ShortcutId, string>;

export const defaultBindings = Object.fromEntries(shortcuts.map(({ id, combo }) => [id, combo])) as Bindings;

const reserved: Record<string, string> = {
  "Mod+A": "Select all",
  "Mod+C": "Copy",
  "Mod+X": "Cut",
  "Mod+V": "Paste",
  "Mod+Z": "Undo",
  "Mod+Shift+Z": "Redo",
  "Mod+Y": "Redo",
  "Mod+Q": "Quit",
  "Mod+W": "Close window",
  "Mod+H": "Hide mneme",
  "Mod+M": "Minimize",
  "Mod+B": "Bold",
  "Mod+I": "Italic",
  "Mod+U": "Underline",
  "Mod+E": "Inline code",
  "Mod+Shift+S": "Strikethrough",
  "Mod+Shift+H": "Highlight",
  "Mod+Shift+B": "Quote",
  "Mod+Shift+7": "Numbered list",
  "Mod+Shift+8": "Bulleted list",
  "Mod+Shift+9": "Checklist",
  "Mod+Alt+C": "Code block",
  "Mod+Alt+0": "Paragraph",
  "Mod+Alt+1": "Heading 1",
  "Mod+Alt+2": "Heading 2",
  "Mod+Alt+3": "Heading 3",
  "Mod+Alt+4": "Heading 4",
  "Mod+Alt+5": "Heading 5",
  "Mod+Alt+6": "Heading 6",
  "Mod+Enter": "Line break",
  "Mod+Backspace": "Delete to line start",
  "Mod+Delete": "Delete to line end"
};

const codeKeys: Record<string, string> = {
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
  BracketLeft: "[",
  BracketRight: "]",
  Semicolon: ";",
  Quote: "'",
  Minus: "-",
  Equal: "=",
  Backquote: "`"
};

const modifierKeys = new Set(["Meta", "Control", "Shift", "Alt", "AltGraph", "CapsLock"]);

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

function keyName(event: Pick<KeyboardEvent, "code" | "key">) {
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3);
  if (/^Digit\d$/.test(event.code)) return event.code.slice(5);
  if (codeKeys[event.code]) return codeKeys[event.code];
  return event.key.length === 1 ? event.key.toUpperCase() : event.key;
}

export function comboFromEvent(event: Pick<KeyboardEvent, "code" | "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">) {
  if (modifierKeys.has(event.key)) return null;
  const parts = [];
  if (isMac ? event.metaKey : event.ctrlKey) parts.push("Mod");
  if (isMac && event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  parts.push(keyName(event));
  return parts.join("+");
}

const macSymbols: Record<string, string> = { Mod: "⌘", Ctrl: "⌃", Alt: "⌥", Shift: "⇧" };
const otherNames: Record<string, string> = { Mod: "Ctrl", Alt: "Alt", Shift: "Shift" };

export function formatCombo(combo: string) {
  const parts = combo.split(/\+(?!$)/);
  return isMac ? parts.map((part) => macSymbols[part] ?? part).join("") : parts.map((part) => otherNames[part] ?? part).join("+");
}

export function shortcutProblem(id: ShortcutId, combo: string, bindings: Bindings) {
  const parts = combo.split(/\+(?!$)/);
  const key = parts[parts.length - 1] ?? "";
  if (!parts.some((part) => part === "Mod" || part === "Ctrl" || part === "Alt") && !/^F\d{1,2}$/.test(key)) {
    return `Include ${isMac ? "⌘, ⌃ or ⌥" : "Ctrl or Alt"} so the shortcut doesn’t fire while you type.`;
  }
  if (reserved[combo]) return `${formatCombo(combo)} is already ${reserved[combo]}. Choose another.`;
  const taken = shortcuts.find((shortcut) => shortcut.id !== id && bindings[shortcut.id] === combo);
  if (taken) return `${formatCombo(combo)} already does “${taken.label}”. Choose another, or change that one first.`;
  return null;
}
