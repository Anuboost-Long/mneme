const MAX_DIMENSION = 1600;

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
    if (scale === 1) return await blobToDataUrl(file);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error();
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(file.type === "image/png" || file.type === "image/svg+xml" ? "image/png" : "image/jpeg", 0.9);
  } catch {
    throw new Error("Couldn’t read this image. Choose another file.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function blobToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error());
    reader.readAsDataURL(file);
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
