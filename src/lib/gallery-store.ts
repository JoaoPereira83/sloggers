import staticGallery from "../../data/gallery.json";

import type { GalleryItem } from "./gallery-types";
import { isProductionServer, isSupabaseConfigured } from "./ride-db";

const missingSupabaseMessage =
  "Gallery uploads need Supabase on Vercel. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, create the gallery_items table and a public gallery storage bucket (see supabase/schema.sql), then redeploy.";

async function useFileStore() {
  return import("./gallery-storage");
}

async function useSupabaseStore() {
  return import("./gallery-db");
}

function sortGalleryItems(items: GalleryItem[]) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function mergeStaticGalleryItems(items: GalleryItem[]) {
  const seen = new Set(items.map((item) => item.src));
  const staticItems = (staticGallery.items as GalleryItem[]).filter((item) => !seen.has(item.src));
  return sortGalleryItems([...items, ...staticItems]);
}

async function ensureGalleryBackend() {
  if (!isSupabaseConfigured() && isProductionServer()) {
    throw new Error(missingSupabaseMessage);
  }
}

export async function listGalleryItems(): Promise<GalleryItem[]> {
  if (isSupabaseConfigured()) {
    const { listGalleryItemsInSupabase } = await useSupabaseStore();
    const items = await listGalleryItemsInSupabase();
    return mergeStaticGalleryItems(items);
  }

  const { readGalleryData, sortGalleryItems: sortFileItems } = await useFileStore();
  const data = await readGalleryData();
  return sortFileItems(data.items);
}

export async function addGalleryItem(input: {
  buffer: Buffer;
  filename: string;
  contentType: string;
  caption: string;
  alt: string;
}): Promise<GalleryItem> {
  await ensureGalleryBackend();

  if (isSupabaseConfigured()) {
    const { insertGalleryItemInSupabase, uploadGalleryImageToSupabase } =
      await useSupabaseStore();
    const { publicUrl, storagePath } = await uploadGalleryImageToSupabase({
      filename: input.filename,
      buffer: input.buffer,
      contentType: input.contentType,
    });

    return insertGalleryItemInSupabase({
      src: publicUrl,
      caption: input.caption,
      alt: input.alt,
      storagePath,
    });
  }

  const { writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { randomUUID } = await import("node:crypto");
  const {
    ensureGalleryUploadDir,
    getGalleryUploadDir,
    readGalleryData,
    writeGalleryData,
  } = await useFileStore();

  await ensureGalleryUploadDir();
  const filepath = join(getGalleryUploadDir(), input.filename);
  await writeFile(filepath, input.buffer);

  const gallery = await readGalleryData();
  const item: GalleryItem = {
    id: randomUUID(),
    src: `/gallery/${input.filename}`,
    caption: input.caption,
    alt: input.alt,
    createdAt: new Date().toISOString(),
  };

  gallery.items.unshift(item);
  await writeGalleryData(gallery);
  return item;
}

export async function updateGalleryItem(
  id: string,
  input: { caption: string; alt: string },
): Promise<GalleryItem> {
  if (isSupabaseConfigured()) {
    const { updateGalleryItemInSupabase } = await useSupabaseStore();
    return updateGalleryItemInSupabase(id, input);
  }

  const { readGalleryData, writeGalleryData } = await useFileStore();
  const gallery = await readGalleryData();
  const index = gallery.items.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error("Photo not found");
  }

  gallery.items[index] = {
    ...gallery.items[index],
    caption: input.caption.trim(),
    alt: input.alt.trim() || input.caption.trim(),
  };

  await writeGalleryData(gallery);
  return gallery.items[index];
}

export async function deleteGalleryItem(id: string) {
  if (isSupabaseConfigured()) {
    const { deleteGalleryImageFromSupabase, deleteGalleryItemInSupabase } =
      await useSupabaseStore();
    const storagePath = await deleteGalleryItemInSupabase(id);
    if (storagePath) {
      await deleteGalleryImageFromSupabase(storagePath);
    }
    return;
  }

  const { readGalleryData, writeGalleryData } = await useFileStore();
  const gallery = await readGalleryData();
  const nextItems = gallery.items.filter((item) => item.id !== id);

  if (nextItems.length === gallery.items.length) {
    throw new Error("Photo not found");
  }

  await writeGalleryData({ items: nextItems });
}
