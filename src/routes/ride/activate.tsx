import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { activateMemberAccount } from "@/lib/member.server";

type ActivateSearch = {
  token?: string;
};

export const Route = createFileRoute("/ride/activate")({
  head: () => ({
    meta: [{ title: "Activate account — Southam Sloggers" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): ActivateSearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ActivateAccountPage,
});

function ActivateAccountPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const startedRef = useRef(false);

  const activationMutation = useMutation({
    mutationFn: () => activateMemberAccount({ data: { token: token ?? "" } }),
    onSuccess: () => {
      window.setTimeout(() => {
        void navigate({ to: "/ride" });
      }, 1500);
    },
  });

  useEffect(() => {
    if (!token || startedRef.current) return;
    startedRef.current = true;
    activationMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per token
  }, [token]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-lg px-6 pt-28 pb-24">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          Ride map account
        </div>
        <h1 className="mt-3 display text-5xl leading-none">Activate account</h1>

        {!token ? (
          <p className="mt-6 text-muted-foreground">
            This activation link is missing or invalid. Open the link from your approval email, or
            sign in at the{" "}
            <Link to="/ride" className="text-primary hover:underline">
              ride map page
            </Link>
            .
          </p>
        ) : activationMutation.isPending ? (
          <div className="mt-8 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Activating your account…
          </div>
        ) : activationMutation.isError ? (
          <div className="mt-8 rounded-3xl border border-destructive/25 bg-card p-8 shadow-soft">
            <p className="text-destructive">
              {activationMutation.error instanceof Error
                ? activationMutation.error.message
                : "Could not activate your account."}
            </p>
            <Link
              to="/ride"
              className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground"
            >
              Back to ride map
            </Link>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-primary/25 bg-card p-8 shadow-soft">
            <p className="text-lg font-medium text-foreground">Your account is now active.</p>
            <p className="mt-3 text-muted-foreground">
              Redirecting you to the live ride map…
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
