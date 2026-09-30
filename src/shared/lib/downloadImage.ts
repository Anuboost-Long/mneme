import { desktop } from "@chain/sdk";

export const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;

// A picture from the web, fetched natively (the webview's own fetch is
// blocked cross-site). Null when it isn't reachable or isn't an image:
// no cookies go with it, so a login-walled site answers with an error or
// a sign-in page, which is ignored.
export async function downloadImage(url: string): Promise<File | null> {
  try {
    const response = await desktop.http.get<Uint8Array>(url, { responseType: "bytes", maxBytes: MAX_DOWNLOAD_BYTES });
    const type = response.headers["content-type"]?.split(";")[0].trim() ?? "";
    if (!response.ok || !type.startsWith("image/")) return null;
    const name = new URL(url).pathname.split("/").pop() || "image";
    return new File([new Uint8Array(response.data)], name, { type });
  } catch {
    return null;
  }
}
