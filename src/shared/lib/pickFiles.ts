import { desktop } from "@chain/sdk";

// Picked files carry no MIME type, but image checks and importers go by
// File.type, so it's restored from the extension.
const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  md: "text/markdown",
  markdown: "text/markdown",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  json: "application/json",
  txt: "text/plain",
  csv: "text/csv",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  zip: "application/zip",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

function mimeType(name: string) {
  return MIME_TYPES[name.split(".").pop()?.toLowerCase() ?? ""] ?? "";
}

// Outside the desktop runtime (a plain browser), the browser's own input.
function browserPick(extensions: string[] | undefined, multiple: boolean) {
  return new Promise<File[]>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple;
    if (extensions?.length) input.accept = extensions.map((extension) => `.${extension}`).join(",");
    input.addEventListener("change", () => resolve(Array.from(input.files ?? [])));
    input.addEventListener("cancel", () => resolve([]));
    input.click();
  });
}

// Opens the OS file picker as a sheet on this window (it slides down from
// the title bar on macOS) rather than a free-floating window. Resolves []
// when the user cancels, or when a picker is already open.
export async function pickFiles({ extensions, multiple = false }: { extensions?: string[]; multiple?: boolean } = {}): Promise<File[]> {
  try {
    const picked = await desktop.files.pick({ extensions, multiple });
    return picked.map((file) => new File([new Uint8Array(file.bytes)], file.name, { type: mimeType(file.name) }));
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "UNAVAILABLE") return [];
    if (code === "UNSUPPORTED") return browserPick(extensions, multiple);
    throw error;
  }
}

export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "svg"];

export const VIDEO_EXTENSIONS = ["mp4", "m4v", "mov", "webm"];
