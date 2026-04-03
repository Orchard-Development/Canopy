const IMAGE_EXTENSIONS = new Set<string>([
  "png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp",
]);

export function isBinaryContent(content: string): boolean {
  const len = Math.min(content.length, 8192);
  for (let i = 0; i < len; i++) {
    if (content.charCodeAt(i) === 0) return true;
  }
  return false;
}

export function isImageFile(filename: string): boolean {
  const parts = filename.split(".");
  if (parts.length < 2) return false;
  return IMAGE_EXTENSIONS.has(parts[parts.length - 1].toLowerCase());
}

function stripTrailingSlashes(p: string): string {
  let end = p.length;
  while (end > 1 && p[end - 1] === "/") end--;
  return p.slice(0, end);
}

export function getParentPath(path: string): string {
  const cleaned = stripTrailingSlashes(path);
  const idx = cleaned.lastIndexOf("/");
  if (idx <= 0) return "";
  return cleaned.slice(0, idx);
}

export function getFileName(path: string): string {
  const cleaned = stripTrailingSlashes(path);
  if (cleaned === "" || cleaned === "/") return "";
  const idx = cleaned.lastIndexOf("/");
  return idx === -1 ? cleaned : cleaned.slice(idx + 1);
}
