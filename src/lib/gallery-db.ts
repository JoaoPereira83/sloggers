import { getSupabaseAdmin, toSupabaseErrorMessage } from "./ride-db";
import type { GalleryItem } from "./gallery-types";

type GalleryItemRow = {
  id: string;
  src: string;
  caption: string;
  alt: string;
  storage_path: string | null;
  created_at: string;
};

const GALLERY_BUCKET = "gallery";

function mapGalleryItem(row: GalleryItemRow): GalleryItem {
  return {
    id: row.id,
    src: row.src,
    caption: row.caption,
    alt: row.alt,
    createdAt: row.created_at,
  };
}

function wrapSupabaseError(error: { message: string }) {
  throw new Error(toSupabaseErrorMessage(error.message));
}

function isMissingGalleryTable(error: { message: string }) {
  return (
    error.message.includes("gallery_items") &&
    (error.message.includes("does not exist") || error.message.includes("Could not find the table"))
  );
}

function missingGalleryTableMessage() {
  return "Gallery database table is missing. Run the gallery_items SQL from supabase/schema.sql in the Supabase SQL editor.";
}

async function ensureGalleryBucket() {
  const supabase = getSupabaseAdmin();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    wrapSupabaseError(listError);
  }

  if (buckets?.some((bucket) => bucket.name === GALLERY_BUCKET)) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(GALLERY_BUCKET, {
    public: true,
    fileSizeLimit: 8 * 1024 * 1024,
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(
      `Could not create the gallery storage bucket automatically (${createError.message}). In Supabase → Storage, create a public bucket named gallery.`,
    );
  }
}

export async function listGalleryItemsInSupabase(): Promise<GalleryItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("gallery_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingGalleryTable(error)) {
      return [];
    }
    wrapSupabaseError(error);
  }
  return (data as GalleryItemRow[]).map(mapGalleryItem);
}

export async function insertGalleryItemInSupabase(input: {
  src: string;
  caption: string;
  alt: string;
  storagePath: string | null;
}): Promise<GalleryItem> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("gallery_items")
    .insert({
      src: input.src,
      caption: input.caption,
      alt: input.alt,
      storage_path: input.storagePath,
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingGalleryTable(error)) {
      throw new Error(missingGalleryTableMessage());
    }
    wrapSupabaseError(error);
  }
  return mapGalleryItem(data as GalleryItemRow);
}

export async function updateGalleryItemInSupabase(
  id: string,
  input: { caption: string; alt: string },
): Promise<GalleryItem> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("gallery_items")
    .update({
      caption: input.caption,
      alt: input.alt,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) wrapSupabaseError(error);
  return mapGalleryItem(data as GalleryItemRow);
}

export async function deleteGalleryItemInSupabase(id: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("gallery_items")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) wrapSupabaseError(fetchError);
  if (!existing) {
    throw new Error("Photo not found");
  }

  const { error: deleteError } = await supabase.from("gallery_items").delete().eq("id", id);
  if (deleteError) wrapSupabaseError(deleteError);

  return (existing as { storage_path: string | null }).storage_path;
}

export async function uploadGalleryImageToSupabase(input: {
  filename: string;
  buffer: Buffer;
  contentType: string;
}): Promise<{ publicUrl: string; storagePath: string }> {
  const supabase = getSupabaseAdmin();
  const storagePath = input.filename;

  await ensureGalleryBucket();

  const { error } = await supabase.storage.from(GALLERY_BUCKET).upload(storagePath, input.buffer, {
    contentType: input.contentType,
    upsert: false,
  });

  if (error) {
    if (error.message.includes("Bucket not found")) {
      await ensureGalleryBucket();
      const retry = await supabase.storage.from(GALLERY_BUCKET).upload(storagePath, input.buffer, {
        contentType: input.contentType,
        upsert: false,
      });
      if (retry.error) {
        throw new Error(
          `Gallery storage is not set up (${retry.error.message}). In Supabase → Storage, create a public bucket named gallery.`,
        );
      }
    } else {
      wrapSupabaseError(error);
    }
  }

  const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl, storagePath };
}

export async function deleteGalleryImageFromSupabase(storagePath: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(GALLERY_BUCKET).remove([storagePath]);
  if (error) wrapSupabaseError(error);
}
