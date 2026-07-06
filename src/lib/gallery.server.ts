import { createServerFn } from "@tanstack/react-start";

import type { AdminSession } from "./session";
import { sessionConfig } from "./session";

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? "sloggers";
}

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const { useSession } = await import("@tanstack/react-start/server");
  const session = await useSession<AdminSession>(sessionConfig);
  return { isAdmin: Boolean(session.data.isAdmin) };
});

export const adminLogin = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    if (data.password !== getAdminPassword()) {
      throw new Error("Invalid password");
    }

    const { useSession } = await import("@tanstack/react-start/server");
    const session = await useSession<AdminSession>(sessionConfig);
    await session.update({ isAdmin: true });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { useSession } = await import("@tanstack/react-start/server");
  const session = await useSession<AdminSession>(sessionConfig);
  await session.clear();
  return { ok: true as const };
});

async function requireAdmin() {
  const { useSession } = await import("@tanstack/react-start/server");
  const session = await useSession<AdminSession>(sessionConfig);
  if (!session.data.isAdmin) {
    throw new Error("Unauthorized");
  }
  return session;
}

export const getGalleryItems = createServerFn({ method: "GET" }).handler(async () => {
  const { readGalleryData, sortGalleryItems } = await import("./gallery-storage");
  const data = await readGalleryData();
  return sortGalleryItems(data.items);
});

export const addGalleryPhoto = createServerFn({ method: "POST", strict: false }).handler(
  async ({ data }) => {
    await requireAdmin();

    if (!(data instanceof FormData)) {
      throw new Error("Expected form data");
    }

    const file = data.get("file");
    const caption = String(data.get("caption") ?? "").trim();
    const alt = String(data.get("alt") ?? caption).trim();

    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Photo file is required");
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed");
    }

    if (file.size > 8 * 1024 * 1024) {
      throw new Error("Image must be 8MB or smaller");
    }

    const { randomUUID } = await import("node:crypto");
    const { writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const {
      ensureGalleryUploadDir,
      getGalleryUploadDir,
      readGalleryData,
      sanitizeFilename,
      writeGalleryData,
    } = await import("./gallery-storage");

    await ensureGalleryUploadDir();

    const extension = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf("."))
      : ".jpg";
    const filename = `${Date.now()}-${sanitizeFilename(file.name.replace(extension, ""))}${extension}`;
    const filepath = join(getGalleryUploadDir(), filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const src = `/gallery/${filename}`;
    const gallery = await readGalleryData();
    const item = {
      id: randomUUID(),
      src,
      caption,
      alt: alt || caption || "Sloggers ride photo",
      createdAt: new Date().toISOString(),
    };

    gallery.items.unshift(item);
    await writeGalleryData(gallery);

    return item;
  },
);

export const updateGalleryPhoto = createServerFn({ method: "POST" })
  .validator((data: { id: string; caption: string; alt: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();

    const { readGalleryData, writeGalleryData } = await import("./gallery-storage");
    const gallery = await readGalleryData();
    const index = gallery.items.findIndex((item) => item.id === data.id);

    if (index === -1) {
      throw new Error("Photo not found");
    }

    gallery.items[index] = {
      ...gallery.items[index],
      caption: data.caption.trim(),
      alt: data.alt.trim() || data.caption.trim(),
    };

    await writeGalleryData(gallery);
    return gallery.items[index];
  });

export const deleteGalleryPhoto = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();

    const { readGalleryData, writeGalleryData } = await import("./gallery-storage");
    const gallery = await readGalleryData();
    const nextItems = gallery.items.filter((item) => item.id !== data.id);

    if (nextItems.length === gallery.items.length) {
      throw new Error("Photo not found");
    }

    await writeGalleryData({ items: nextItems });
    return { ok: true as const };
  });
