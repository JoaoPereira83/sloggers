import { createFileRoute } from "@tanstack/react-router";

import { JoinSection } from "@/components/home/sections";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join us — Southam Sloggers" },
      {
        name: "description",
        content:
          "Request to join the Southam Sloggers. Drop your details and we'll send this Sunday's meeting point.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  return (
    <PageShell mainClassName="pb-24">
      <JoinSection />
    </PageShell>
  );
}
