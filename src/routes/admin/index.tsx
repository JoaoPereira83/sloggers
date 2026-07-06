import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Check, ImagePlus, Loader2, LogOut, Trash2, X } from "lucide-react";

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
import {
  approveMember,
  createMembersAsAdmin,
  listMembersForAdmin,
  rejectMember,
} from "@/lib/member.server";
import { sendMemberActivationEmailFromBrowser } from "@/lib/member-approval-email";
import type { GalleryItem } from "@/lib/gallery-types";
import type { PublicMember } from "@/lib/member-types";

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
  const [activeTab, setActiveTab] = useState<"gallery" | "members">("gallery");

  const sessionQuery = useQuery({
    queryKey: ["admin-session"],
    queryFn: () => getAdminSession(),
  });

  const galleryQuery = useQuery({
    queryKey: ["gallery-items"],
    queryFn: () => getGalleryItems(),
    enabled: Boolean(sessionQuery.data?.isAdmin),
  });

  const membersQuery = useQuery({
    queryKey: ["admin-members"],
    queryFn: () => listMembersForAdmin(),
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
      queryClient.removeQueries({ queryKey: ["admin-members"] });
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
            <h1 className="mt-3 display text-5xl leading-none">Site admin</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Manage gallery photos and approve members for live ride map access.
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
          <>
            <div className="mt-8 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("gallery")}
                className={`rounded-full px-5 py-2 text-sm font-semibold uppercase tracking-wider ${
                  activeTab === "gallery"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-muted"
                }`}
              >
                Gallery
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("members")}
                className={`rounded-full px-5 py-2 text-sm font-semibold uppercase tracking-wider ${
                  activeTab === "members"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-muted"
                }`}
              >
                Members
                {membersQuery.data?.some((member) => member.status === "pending") ? (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-xs">
                    {membersQuery.data.filter((member) => member.status === "pending").length}
                  </span>
                ) : null}
              </button>
            </div>

            {activeTab === "gallery" ? (
              <AdminGalleryEditor
                items={galleryQuery.data ?? []}
                isLoading={galleryQuery.isLoading}
                onChanged={() => queryClient.invalidateQueries({ queryKey: ["gallery-items"] })}
              />
            ) : (
              <AdminMembersPanel
                members={membersQuery.data ?? []}
                isLoading={membersQuery.isLoading}
                onChanged={() => queryClient.invalidateQueries({ queryKey: ["admin-members"] })}
              />
            )}
          </>
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="sr-only"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted"
              >
                <ImagePlus className="h-4 w-4" />
                Choose photo
              </button>
              <span className="text-sm text-muted-foreground">
                {file ? file.name : "No photo selected"}
              </span>
            </div>
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
            disabled={uploadMutation.isPending || !file}
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

function memberStatusLabel(status: PublicMember["status"]) {
  if (status === "pending") return "Pending";
  if (status === "awaiting_activation") return "Awaiting email";
  if (status === "approved") return "Active";
  return "Rejected";
}

function parseMemberEntries(raw: string) {
  const members: { displayName: string; email: string }[] = [];
  const invalid: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const commaIndex = trimmed.indexOf(",");
    if (commaIndex === -1) {
      invalid.push(trimmed);
      continue;
    }

    const displayName = trimmed.slice(0, commaIndex).trim();
    const email = trimmed.slice(commaIndex + 1).trim();

    if (!displayName || !email) {
      invalid.push(trimmed);
      continue;
    }

    members.push({ displayName, email });
  }

  return { members, invalid };
}

function AdminMembersPanel({
  members,
  isLoading,
  onChanged,
}: {
  members: PublicMember[];
  isLoading: boolean;
  onChanged: () => void;
}) {
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [bulkEntries, setBulkEntries] = useState("");
  const [sharedPassword, setSharedPassword] = useState("");
  const [approveImmediately, setApproveImmediately] = useState(true);
  const [addError, setAddError] = useState<string | null>(null);

  const approveMutation = useMutation({
    mutationFn: async (member: PublicMember) => {
      const result = await approveMember({ data: { memberId: member.id } });
      return { result, member };
    },
    onSuccess: async ({ result, member }) => {
      onChanged();

      if (result.emailSent) {
        setEmailNotice(
          `Approved ${member.displayName}. Activation email sent to ${member.email}.`,
        );
        return;
      }

      try {
        await sendMemberActivationEmailFromBrowser({
          email: member.email,
          displayName: member.displayName,
          activationUrl: result.activationUrl,
        });
        setEmailNotice(
          `Approved ${member.displayName}. Activation email sent to ${member.email}.`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not send the activation email.";
        setEmailNotice(
          `Approved ${member.displayName}, but the activation email could not be sent (${message}).`,
        );
      }
    },
    onError: () => {
      setEmailNotice(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (memberId: string) => rejectMember({ data: { memberId } }),
    onSuccess: onChanged,
  });

  const createMembersMutation = useMutation({
    mutationFn: (payload: {
      members: { email: string; displayName: string }[];
      password: string;
      approveImmediately: boolean;
    }) => createMembersAsAdmin({ data: payload }),
    onSuccess: async (result) => {
      onChanged();
      setAddError(null);
      setAddName("");
      setAddEmail("");
      setBulkEntries("");
      setSharedPassword("");

      const createdCount = result.created.length;
      const skippedText =
        result.skipped.length > 0
          ? ` Skipped ${result.skipped.length} existing email${result.skipped.length === 1 ? "" : "s"}.`
          : "";

      if (!approveImmediately) {
        setEmailNotice(
          `Added ${createdCount} member${createdCount === 1 ? "" : "s"}.${skippedText} Approve them when you are ready.`,
        );
        return;
      }

      let sentCount = 0;
      for (const approval of result.approvals) {
        if (approval.emailSent) {
          sentCount += 1;
          continue;
        }

        try {
          await sendMemberActivationEmailFromBrowser({
            email: approval.member.email,
            displayName: approval.member.displayName,
            activationUrl: approval.activationUrl,
          });
          sentCount += 1;
        } catch (error) {
          console.error("Failed to send activation email from browser:", error);
        }
      }

      setEmailNotice(
        `Added ${createdCount} member${createdCount === 1 ? "" : "s"} and sent ${sentCount} activation email${sentCount === 1 ? "" : "s"}.${skippedText}`,
      );
    },
    onError: (error) => {
      setEmailNotice(null);
      setAddError(error instanceof Error ? error.message : "Could not add members.");
    },
  });

  const pendingMembers = members.filter((member) => member.status === "pending");
  const otherMembers = members.filter((member) => member.status !== "pending");

  return (
    <div className="mt-12 space-y-12">
      {emailNotice ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground">
          {emailNotice}
        </p>
      ) : null}
      <section className="rounded-3xl border border-border bg-card p-8 shadow-soft">
        <h2 className="display text-3xl">Add members</h2>
        <p className="mt-2 text-muted-foreground">
          Pre-register Sloggers who have not signed up yet. Use one line per person for bulk add:
          <span className="font-medium text-foreground"> Name, email@example.com</span>
        </p>

        <form
          className="mt-6 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setAddError(null);
            createMembersMutation.mutate({
              members: [{ displayName: addName, email: addEmail }],
              password: sharedPassword,
              approveImmediately,
            });
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs uppercase tracking-widest text-muted-foreground">
                Display name
              </label>
              <input
                value={addName}
                onChange={(event) => setAddName(event.target.value)}
                required
                placeholder="Joao Pereira"
                className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                value={addEmail}
                onChange={(event) => setAddEmail(event.target.value)}
                required
                placeholder="joao@example.com"
                className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Bulk add
            </label>
            <textarea
              value={bulkEntries}
              onChange={(event) => setBulkEntries(event.target.value)}
              rows={4}
              placeholder={"Joao Pereira, joao@example.com\nMaria Silva, maria@example.com"}
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Temporary password
            </label>
            <input
              type="password"
              value={sharedPassword}
              onChange={(event) => setSharedPassword(event.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Share this with each member after they activate their account.
            </p>
          </div>

          <label className="inline-flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={approveImmediately}
              onChange={(event) => setApproveImmediately(event.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Approve immediately and send activation email
          </label>

          {addError ? <p className="text-sm text-destructive">{addError}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={createMembersMutation.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {createMembersMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add member
            </button>
            <button
              type="button"
              disabled={createMembersMutation.isPending || !bulkEntries.trim()}
              onClick={() => {
                setAddError(null);
                if (sharedPassword.length < 8) {
                  setAddError("Temporary password must be at least 8 characters.");
                  return;
                }
                const { members: parsedMembers, invalid } = parseMemberEntries(bulkEntries);
                if (invalid.length > 0) {
                  setAddError(
                    `Could not read ${invalid.length} line${invalid.length === 1 ? "" : "s"}. Use: Name, email@example.com`,
                  );
                  return;
                }
                if (!parsedMembers.length) {
                  setAddError("Add at least one member line.");
                  return;
                }
                createMembersMutation.mutate({
                  members: parsedMembers,
                  password: sharedPassword,
                  approveImmediately,
                });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-muted disabled:opacity-60"
            >
              Add all from list
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-border bg-card p-8 shadow-soft">
        <h2 className="display text-3xl">Pending approvals</h2>
        <p className="mt-2 text-muted-foreground">
          Approve members to send them an activation email. They must click the link before they can
          use the live ride map.
        </p>
        {isLoading ? (
          <div className="mt-6 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading members…
          </div>
        ) : pendingMembers.length === 0 ? (
          <p className="mt-6 text-muted-foreground">No pending member requests.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {pendingMembers.map((member) => (
              <article
                key={member.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{member.displayName}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requested {new Date(member.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(member)}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate(member.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-destructive/30 px-4 py-2 text-sm text-destructive"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="display text-3xl">All members</h2>
        {isLoading ? (
          <div className="mt-6 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading members…
          </div>
        ) : otherMembers.length === 0 ? (
          <p className="mt-6 text-muted-foreground">No approved or rejected members yet.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {otherMembers.map((member) => (
              <article
                key={member.id}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{member.displayName}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                      member.status === "approved"
                        ? "bg-primary/10 text-primary"
                        : member.status === "awaiting_activation"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {memberStatusLabel(member.status)}
                  </span>
                  {member.status === "rejected" ? (
                    <button
                      type="button"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(member)}
                      className="text-sm text-primary hover:underline"
                    >
                      Approve
                    </button>
                  ) : null}
                  {member.status === "approved" ? (
                    <button
                      type="button"
                      disabled={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate(member.id)}
                      className="text-sm text-destructive hover:underline"
                    >
                      Revoke
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
