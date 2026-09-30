import { desktop } from "@chain/sdk";

const MAX_FILE_BYTES = 200 * 1024 * 1024;

export function fileExtension(name: string) {
  const extension = /\.([a-z0-9]{1,10})$/i.exec(name)?.[1];
  return extension?.toLowerCase();
}

// Writes a page's file (a video, an attachment) through desktop.files,
// keeping its extension so the OS knows what opens it. Returns the
// reference: the caller owns deleting it.
export async function storePageFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 200 MB. Choose a smaller file.`);
  const extension = fileExtension(file.name);
  return desktop.files.write(new Uint8Array(await file.arrayBuffer()), extension ? { extension } : undefined);
}

// A YouTube or Vimeo link as its player URL, or null for any other link.
export function videoEmbedUrl(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  let youtubeId: string | null = null;
  if (host === "youtu.be") youtubeId = url.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    youtubeId = url.searchParams.get("v") ?? /^\/(?:embed|shorts|live)\/([\w-]+)/.exec(url.pathname)?.[1] ?? null;
  }
  if (youtubeId && /^[\w-]{6,20}$/.test(youtubeId)) return `https://www.youtube-nocookie.com/embed/${youtubeId}`;
  const vimeoId = host === "vimeo.com" || host === "player.vimeo.com" ? /(\d{5,})/.exec(url.pathname)?.[1] : undefined;
  return vimeoId ? `https://player.vimeo.com/video/${vimeoId}` : null;
}
