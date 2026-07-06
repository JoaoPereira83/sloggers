import { createFileRoute } from "@tanstack/react-router";

import { RideSection } from "@/components/home/sections";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/the-ride")({
  head: () => ({
    meta: [
      { title: "The ride — Southam Sloggers" },
      {
        name: "description",
        content:
          "Most Sunday mornings from Southam, Warwickshire. Steady social pace, weather permitting — regroup often, never leave anyone behind.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  component: TheRidePage,
});

function TheRidePage() {
  return (
    <PageShell mainClassName="pb-24">
      <RideSection />
    </PageShell>
  );
}
