const languageNames = new Intl.DisplayNames([navigator.language], { type: "language" });

export function languageName(tag: string) {
  try {
    return languageNames.of(tag) ?? tag;
  } catch {
    return tag;
  }
}
