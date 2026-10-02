// A `desktop.files` reference: 16 hex characters and an optional extension.
// A typed emoji or symbol icon is at most 8 characters, so it never matches.
export function isFileReference(value: string | null | undefined) {
  return /^[0-9a-f]{16}(\.[a-z0-9]+)?$/.test(value ?? "");
}
