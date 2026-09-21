// chain-sdk's chainError() (used by every desktop.* capability's rejection)
// returns a plain {code, message} object, never a real Error instance — so
// `error instanceof Error` is false for every one of them, and code that
// checks it silently falls back to a generic message instead of the real
// one. Checking for a string `.message` field instead catches both real
// Errors and ChainErrors the same way.
export function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
}
