import { createFileRoute } from "@tanstack/react-router";

import { CafeSection } from "@/components/home/sections";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/coffee")({
  head: () => ({
    meta: [
      { title: "Coffee stop — Southam Sloggers" },
      {
        name: "description",
        content:
          "Every Sloggers ride stops for coffee and cake. The reward we've been thinking about since the first climb.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  component: CoffeePage,
});

function CoffeePage() {
  return (
    <PageShell>
      <CafeSection />
    </PageShell>
  );
}
