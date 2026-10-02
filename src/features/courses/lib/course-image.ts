import { desktop, sql } from "@chain/sdk";

import { isFileReference } from "../../../shared/lib/fileReference";
import { base64Bytes, copyImage, deleteImage } from "./page-image";

export async function courseImage(file: File): Promise<string> {
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
    const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error();
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    throw new Error("Couldn’t read this image. Choose another file.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function storeIcon(icon: string | null | undefined) {
  const trimmed = icon?.trim() || null;
  const base64 = trimmed && /^data:image\/png;base64,(.+)$/.exec(trimmed)?.[1];
  return base64 ? desktop.files.write(base64Bytes(base64), { extension: "png" }) : trimmed;
}

export async function deleteReplacedIcon(previous: string | null | undefined, next: string | null) {
  if (previous && isFileReference(previous) && previous !== next) await deleteImage(previous);
}

export async function deleteIcon(icon: string | null | undefined) {
  if (icon && isFileReference(icon)) await deleteImage(icon);
}

export async function copyIcon(icon: string | null) {
  return icon && isFileReference(icon) ? copyImage(icon) : icon;
}

export async function storeInlineIcons() {
  for (const name of ["course", "module", "page"]) {
    const table = desktop.storage.table<{ id: number; icon: string | null }>(name);
    for (const { id, icon } of await table.where(sql`icon LIKE 'data:image/%'`).all()) {
      const reference = await storeIcon(icon);
      const updated = await table.update({ id, icon }, { icon: reference });
      if (updated.length === 0) await deleteIcon(reference);
    }
  }
}
