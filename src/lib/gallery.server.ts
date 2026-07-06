import { createServerFn } from "@tanstack/react-start";

import type { AdminSession } from "./session";
import { sessionConfig } from "./session";

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? "sloggers";
}

function getAdminPasswords() {
  const list = (process.env.ADMIN_PASSWORDS ?? getAdminPassword())
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set(list);
}

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const { useSession } = await import("@tanstack/react-start/server");
  const session = await useSession<AdminSession>(sessionConfig);
  return { isAdmin: Boolean(session.data.isAdmin) };
});

export const adminLogin = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    if (!getAdminPasswords().has(data.password)) {
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
  const { listGalleryItems } = await import("./gallery-store");
  return listGalleryItems();
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

    const { sanitizeFilename } = await import("./gallery-storage");
    const { addGalleryItem } = await import("./gallery-store");

    const extension = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf("."))
      : ".jpg";
    const filename = `${Date.now()}-${sanitizeFilename(file.name.replace(extension, ""))}${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    return addGalleryItem({
      buffer,
      filename,
      contentType: file.type,
      caption,
      alt: alt || caption || "Sloggers ride photo",
    });
  },
);

export const updateGalleryPhoto = createServerFn({ method: "POST" })
  .validator((data: { id: string; caption: string; alt: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();

    const { updateGalleryItem } = await import("./gallery-store");
    return updateGalleryItem(data.id, {
      caption: data.caption.trim(),
      alt: data.alt.trim() || data.caption.trim(),
    });
  });

export const deleteGalleryPhoto = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();

    const { deleteGalleryItem } = await import("./gallery-store");
    await deleteGalleryItem(data.id);
    return { ok: true as const };
  });
