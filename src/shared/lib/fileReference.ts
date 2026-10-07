export function isFileReference(value: string | null | undefined) {
  return /^[0-9a-f]{16}(\.[a-z0-9]+)?$/.test(value ?? "");
}
