import { createFileRoute } from "@tanstack/react-router";

import { AboutSection } from "@/components/home/sections";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Who we are — Southam Sloggers" },
      {
        name: "description",
        content:
          "The Southam Sloggers are a friendly Sunday cycling group in Warwickshire. Social pace, purple kit, and nobody left behind.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PageShell>
      <AboutSection />
    </PageShell>
  );
}
