import { downloadImage } from "./downloadImage";

export type ImageData = { mediaType: string; bytes: Uint8Array };

const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCodePoint(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

// The pictures in `html`, loaded as bytes, and the html with each one
// replaced by an "[Image N]" marker, so an agent reading the text knows
// which picture sat where. Page images are app-local URLs an agent can't
// open, so they have to travel as image data. Past MAX_IMAGES, or when a
// picture can't be read, the marker says so instead.
export async function extractImages(html: string): Promise<{ html: string; images: ImageData[] }> {
  const document = new DOMParser().parseFromString(html, "text/html");
  const images: ImageData[] = [];
  for (const element of Array.from(document.querySelectorAll("img"))) {
    const alt = element.getAttribute("alt")?.trim();
    const described = alt ? `: ${alt}` : "";
    const label = (text: string) => document.createTextNode(`[${text}${described}]`);
    const loaded = images.length < MAX_IMAGES ? await load(element.getAttribute("src")) : null;
    if (loaded) images.push(loaded);
    element.replaceWith(label(loaded ? `Image ${images.length}` : "Image not included"));
  }
  return { html: document.body.innerHTML, images };
}

const MEDIA_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

// Stored pictures load through the webview; one still on the web (an
// older import) is downloaded natively instead.
async function load(src: string | null): Promise<ImageData | null> {
  if (!src) return null;
  const local = await loadInWebview(src);
  if (local || !/^https?:/i.test(src)) return local;
  const file = await downloadImage(src);
  if (!file || file.size > MAX_IMAGE_BYTES) return null;
  return { mediaType: file.type, bytes: new Uint8Array(await file.arrayBuffer()) };
}

async function loadInWebview(src: string): Promise<ImageData | null> {
  try {
    const response = await fetch(src);
    if (!response.ok) return null;
    const blob = await response.blob();
    // App-local file URLs may answer without a content type.
    const mediaType = blob.type || MEDIA_TYPES[/\.([a-z]+)(?:$|\?)/i.exec(src)?.[1]?.toLowerCase() ?? ""];
    if (blob.size > MAX_IMAGE_BYTES || !mediaType?.startsWith("image/")) return null;
    return { mediaType, bytes: new Uint8Array(await blob.arrayBuffer()) };
  } catch {
    return null;
  }
}
