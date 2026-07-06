import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { GalleryData, GalleryItem } from "./gallery-types";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const galleryDataPath = join(projectRoot, "data/gallery.json");
const galleryUploadDir = join(projectRoot, "public/gallery");

export function getGalleryUploadDir() {
  return galleryUploadDir;
}

export async function readGalleryData(): Promise<GalleryData> {
  try {
    const raw = await readFile(galleryDataPath, "utf-8");
    return JSON.parse(raw) as GalleryData;
  } catch {
    return { items: [] };
  }
}

export async function writeGalleryData(data: GalleryData) {
  await mkdir(dirname(galleryDataPath), { recursive: true });
  await writeFile(galleryDataPath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

export async function ensureGalleryUploadDir() {
  await mkdir(galleryUploadDir, { recursive: true });
}

export function sortGalleryItems(items: GalleryItem[]) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function sanitizeFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
