import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { sendPasswordResetEmailFromBrowser } from "@/lib/member-approval-email";
import { requestPasswordReset } from "@/lib/member.server";

export const Route = createFileRoute("/ride/forgot-password")({
  head: () => ({
    meta: [{ title: "Forgot password — Southam Sloggers" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async () => {
      const result = await requestPasswordReset({ data: { email } });

      if (result.resetUrl && result.displayName && result.email) {
        await sendPasswordResetEmailFromBrowser({
          email: result.email,
          displayName: result.displayName,
          resetUrl: result.resetUrl,
        });
      }

      return result;
    },
    onSuccess: () => {
      setError(null);
      setSubmitted(true);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-lg px-6 pt-28 pb-24">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          Ride map account
        </div>
        <h1 className="mt-3 display text-5xl leading-none">Forgot password</h1>

        {submitted ? (
          <div className="mt-8 rounded-3xl border border-primary/25 bg-card p-8 shadow-soft">
            <p className="text-lg font-medium text-foreground">Check your email</p>
            <p className="mt-3 text-muted-foreground">
              If an account exists for that address, we&apos;ve sent a link to reset your password.
              The link expires in 1 hour.
            </p>
            <Link
              to="/ride"
              className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border-2 border-primary/30 bg-card p-8 shadow-soft">
            <p className="text-muted-foreground">
              Enter the email address for your Sloggers account and we&apos;ll send you a link to
              reset your password.
            </p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                resetMutation.mutate();
              }}
            >
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
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
                Send reset link
              </button>
            </form>
            <Link
              to="/ride"
              className="mt-6 inline-block text-sm text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
