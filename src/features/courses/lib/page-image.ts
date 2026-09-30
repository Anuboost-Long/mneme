import { desktop } from "@chain/sdk";

import { IMAGE_EXTENSIONS, pickFiles } from "../../../shared/lib/pickFiles";

const MAX_DIMENSION = 1600;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

// Resizes to fit MAX_DIMENSION and writes the image through desktop.files,
// returning its reference: the caller owns deleting it.
export function checkImage(file: File) {
  if (!(file.type in EXTENSIONS)) throw new Error("Choose a PNG, JPEG, WebP, GIF or SVG image.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose an image smaller than 10 MB.");
}

export async function storeImage(file: File): Promise<string> {
  checkImage(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    if (scale === 1) return await writeImage(file, EXTENSIONS[file.type]);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error();
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const resizedType = file.type === "image/png" || file.type === "image/svg+xml" ? "image/png" : "image/jpeg";
    const blob = await canvasToBlob(canvas, resizedType, 0.9);
    return await writeImage(blob, EXTENSIONS[resizedType]);
  } catch {
    throw new Error("Couldn’t read this image. Choose another file.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Pasted/dropped images are written to disk via `desktop.files` instead of
// base64-inlined into the page's content — real files, not a ~33% storage
// inflation shuttled through IPC on every read of that row.
async function writeImage(blob: Blob, extension: string): Promise<string> {
  return desktop.files.write(new Uint8Array(await blob.arrayBuffer()), { extension });
}

// Best effort: a missing file is already gone.
export function deleteImage(reference: string) {
  return desktop.files.delete(reference).catch(() => undefined);
}

// A copy the caller owns, so deleting either one leaves the other intact.
export async function copyImage(reference: string) {
  const bytes = await desktop.files.read(reference);
  const extension = /\.([a-z0-9]+)$/i.exec(reference)?.[1];
  return desktop.files.write(bytes, extension ? { extension } : undefined);
}

export async function pageImage(file: File): Promise<string> {
  return desktop.files.url(await storeImage(file));
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error())), type, quality);
  });
}

export async function pickImage(): Promise<string | null> {
  const [file] = await pickFiles({ extensions: IMAGE_EXTENSIONS }).catch(() => []);
  return file ? pageImage(file).catch(() => null) : null;
}
