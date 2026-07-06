import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { resetMemberPassword } from "@/lib/member.server";

type ResetSearch = {
  token?: string;
};

export const Route = createFileRoute("/ride/reset-password")({
  head: () => ({
    meta: [{ title: "Reset password — Southam Sloggers" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): ResetSearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const resetMutation = useMutation({
    mutationFn: () => resetMemberPassword({ data: { token: token ?? "", password } }),
    onSuccess: () => {
      setError(null);
      setDone(true);
      window.setTimeout(() => {
        void navigate({ to: "/ride" });
      }, 1500);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-lg px-6 pt-28 pb-24">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          Ride map account
        </div>
        <h1 className="mt-3 display text-5xl leading-none">Reset password</h1>

        {!token ? (
          <p className="mt-6 text-muted-foreground">
            This reset link is missing or invalid. Request a new one from the{" "}
            <Link to="/ride/forgot-password" className="text-primary hover:underline">
              forgot password page
            </Link>
            .
          </p>
        ) : done ? (
          <div className="mt-8 rounded-3xl border border-primary/25 bg-card p-8 shadow-soft">
            <p className="text-lg font-medium text-foreground">Password updated</p>
            <p className="mt-3 text-muted-foreground">Redirecting you to the ride map…</p>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border-2 border-primary/30 bg-card p-8 shadow-soft">
            <p className="text-muted-foreground">Choose a new password for your account.</p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (password !== confirmPassword) {
                  setError("Passwords do not match.");
                  return;
                }
                resetMutation.mutate();
              }}
            >
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground">
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3"
                />
                <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3"
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <button
                type="submit"
                disabled={resetMutation.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
              >
                {resetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Update password
              </button>
            </form>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
