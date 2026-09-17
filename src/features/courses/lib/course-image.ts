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
