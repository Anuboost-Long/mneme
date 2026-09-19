import { desktop } from "@chain/sdk";

const MAX_DIMENSION = 1600;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export async function pageImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"].includes(file.type)) {
    throw new Error("Choose a PNG, JPEG, WebP, GIF or SVG image.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 10 MB.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    if (scale === 1) return await storeImage(file, EXTENSIONS[file.type]);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error();
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const resizedType = file.type === "image/png" || file.type === "image/svg+xml" ? "image/png" : "image/jpeg";
    const blob = await canvasToBlob(canvas, resizedType, 0.9);
    return await storeImage(blob, EXTENSIONS[resizedType]);
  } catch {
    throw new Error("Couldn’t read this image. Choose another file.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Pasted/dropped images are written to disk via `desktop.files` instead of
// base64-inlined into the page's content — real files, not a ~33% storage
// inflation shuttled through IPC on every read of that row.
async function storeImage(blob: Blob, extension: string): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const reference = await desktop.files.write(bytes, { extension });
  return desktop.files.url(reference);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error())), type, quality);
  });
}

export function pickImage(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
    input.style.display = "none";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) { resolve(null); return; }
      pageImage(file).then(resolve).catch(() => resolve(null));
    });
    document.body.appendChild(input);
    input.click();
  });
}
