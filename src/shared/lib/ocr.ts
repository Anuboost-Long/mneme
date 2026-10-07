import { desktop, type RecognizedDocument } from "@chain/sdk";

import { downloadImage } from "./downloadImage";
import { errorMessage } from "./errorMessage";

export const LOW_CONFIDENCE = 0.5;

export type ExtractedText = { text: string; uncertainLines: number };

// Stored pictures load through the webview; one still on the web (an
// older import) is downloaded natively instead.
async function imageBytes(imageSrc: string) {
  try {
    const response = await fetch(imageSrc);
    if (!response.ok) throw new Error(`Image request failed with ${response.status}.`);
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    const file = /^https?:/i.test(imageSrc) ? await downloadImage(imageSrc) : null;
    if (file) return new Uint8Array(await file.arrayBuffer());
    throw new Error("Couldn’t read this image. Try pasting it into the page again.");
  }
}

function recognitionError(error: unknown, fallback: string) {
  const code = (error as { code?: string } | null)?.code;
  if (code === "INVALID_ARGUMENT") return new Error("This image format can’t be read. Use a PNG or JPEG.");
  return new Error(errorMessage(error, fallback));
}

// On-device only (Vision on macOS), so the image never leaves the machine.
export async function extractText(imageSrc: string): Promise<ExtractedText> {
  return extractTextFromBytes(await imageBytes(imageSrc));
}

export async function extractTextFromBytes(bytes: Uint8Array): Promise<ExtractedText> {
  try {
    const result = await desktop.vision.recognizeText(bytes);
    return {
      text: result.text,
      uncertainLines: result.lines.filter((line) => line.confidence < LOW_CONFIDENCE).length
    };
  } catch (error) {
    if ((error as { code?: string } | null)?.code === "UNSUPPORTED")
      throw new Error("Text extraction isn’t available on this system.");
    throw recognitionError(error, "Couldn’t extract text from this image. Try again.");
  }
}

export async function extractTables(imageSrc: string): Promise<RecognizedDocument["tables"]> {
  const bytes = await imageBytes(imageSrc);
  let document: RecognizedDocument | null;
  try {
    document = await recognizeDocument(bytes);
  } catch (error) {
    throw recognitionError(error, "Couldn’t read tables from this image. Try again.");
  }
  if (!document) throw new Error("Table extraction needs macOS 26 or later.");
  return document.tables;
}

// Paragraphs, tables and lists in an image, or null where the OS has no
// document recognizer (before macOS 26, Windows) and callers keep their
// plain-text path.
export async function recognizeDocument(image: Uint8Array): Promise<RecognizedDocument | null> {
  try {
    return await desktop.vision.recognizeDocument(image);
  } catch (error) {
    if ((error as { code?: string } | null)?.code === "UNSUPPORTED") return null;
    throw error;
  }
}
