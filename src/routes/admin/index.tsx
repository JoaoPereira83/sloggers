import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, LogOut, Trash2 } from "lucide-react";

import { SiteFooter, SiteNav } from "@/components/SiteNav";
import {
  addGalleryPhoto,
  adminLogin,
  adminLogout,
  deleteGalleryPhoto,
  getAdminSession,
  getGalleryItems,
  updateGalleryPhoto,
} from "@/lib/gallery.server";
import type { GalleryItem } from "@/lib/gallery-types";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Admin — Southam Sloggers Gallery" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ["admin-session"],
    queryFn: () => getAdminSession(),
  });

  const galleryQuery = useQuery({
    queryKey: ["gallery-items"],
    queryFn: () => getGalleryItems(),
    enabled: Boolean(sessionQuery.data?.isAdmin),
  });

  const loginMutation = useMutation({
    mutationFn: (password: string) => adminLogin({ data: { password } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-session"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-items"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => adminLogout(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-session"] });
      queryClient.removeQueries({ queryKey: ["gallery-items"] });
    },
  });

  const isAdmin = Boolean(sessionQuery.data?.isAdmin);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 pt-28 pb-24">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Admin
            </div>
            <h1 className="mt-3 display text-5xl leading-none">Gallery editor</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Log in to upload ride photos, edit captions, and remove old shots.
            </p>
          </div>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          ) : null}
        </div>

        {sessionQuery.isLoading ? (
          <div className="mt-16 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking session…
          </div>
        ) : isAdmin ? (
          <AdminGalleryEditor
            items={galleryQuery.data ?? []}
            isLoading={galleryQuery.isLoading}
            onChanged={() => queryClient.invalidateQueries({ queryKey: ["gallery-items"] })}
          />
        ) : (
          <LoginForm
            onSubmit={(password) => loginMutation.mutate(password)}
            isSubmitting={loginMutation.isPending}
            error={loginMutation.isError ? "Incorrect password. Try again." : null}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function LoginForm({
  onSubmit,
  isSubmitting,
  error,
}: {
  onSubmit: (password: string) => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const [password, setPassword] = useState("");

  return (
    <form
      className="mt-12 max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(password);
      }}
    >
      <label className="block text-xs uppercase tracking-widest text-muted-foreground">
        Admin password
      </label>
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Log in
      </button>
    </form>
  );
}

function AdminGalleryEditor({
  items,
  isLoading,
  onChanged,
}: {
  items: GalleryItem[];
  isLoading: boolean;
  onChanged: () => void;
}) {
  const [caption, setCaption] = useState("");
  const [alt, setAlt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editAlt, setEditAlt] = useState("");

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a photo first");
      const formData = new FormData();
      formData.set("file", file);
      formData.set("caption", caption);
      formData.set("alt", alt);
      return addGalleryPhoto({ data: formData });
    },
    onSuccess: () => {
      setCaption("");
      setAlt("");
      setFile(null);
      setUploadError(null);
      onChanged();
    },
    onError: (error) => {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; caption: string; alt: string }) =>
      updateGalleryPhoto({ data: payload }),
    onSuccess: () => {
      setEditingId(null);
      onChanged();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGalleryPhoto({ data: { id } }),
    onSuccess: onChanged,
  });

  return (
    <div className="mt-12 space-y-12">
      <section className="rounded-3xl border border-border bg-card p-8 shadow-soft">
        <h2 className="display text-3xl">Add a photo</h2>
        <form
          className="mt-6 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            uploadMutation.mutate();
          }}
        >
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
              className="mt-2 block w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Caption
            </label>
            <input
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Sunday spin through the Feldon"
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Alt text
            </label>
            <input
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              placeholder="Describe the photo for accessibility"
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3"
            />
          </div>
          {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
          <button
            type="submit"
            disabled={uploadMutation.isPending}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Upload photo
          </button>
        </form>
      </section>

      <section>
        <h2 className="display text-3xl">Current photos</h2>
        {isLoading ? (
          <div className="mt-6 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading gallery…
          </div>
        ) : items.length === 0 ? (
          <p className="mt-6 text-muted-foreground">No photos in the gallery yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-start"
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="h-32 w-full rounded-xl object-cover md:w-48"
                />
                <div className="flex-1">
                  {editingId === item.id ? (
                    <div className="grid gap-3">
                      <input
                        value={editCaption}
                        onChange={(event) => setEditCaption(event.target.value)}
                        className="rounded-xl border border-input bg-background px-4 py-2"
                      />
                      <input
                        value={editAlt}
                        onChange={(event) => setEditAlt(event.target.value)}
                        className="rounded-xl border border-input bg-background px-4 py-2"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateMutation.mutate({
                              id: item.id,
                              caption: editCaption,
                              alt: editAlt,
                            })
                          }
                          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-full border border-border px-4 py-2 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium">{item.caption || "Untitled photo"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.alt}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditCaption(item.caption);
                          setEditAlt(item.alt);
                        }}
                        className="mt-3 text-sm text-primary hover:underline"
                      >
                        Edit details
                      </button>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Delete photo"
                  onClick={() => {
                    if (window.confirm("Delete this photo from the gallery?")) {
                      deleteMutation.mutate(item.id);
                    }
                  }}
                  className="inline-flex items-center gap-2 self-start rounded-full border border-destructive/30 px-4 py-2 text-sm text-destructive hover:bg-destructive/5"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
