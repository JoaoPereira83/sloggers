import { createFileRoute } from "@tanstack/react-router";

import { HeroSection, HomeTeasersSection } from "@/components/home/sections";
import { SiteFooter, SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Southam Sloggers — Sunday Cycling Club, Warwickshire" },
      {
        name: "description",
        content:
          "Southam Sloggers is a friendly Sunday cycling group based in Southam, Warwickshire. Rolling roads, good pace, and a proper coffee-and-cake stop. Come and ride with us.",
      },
      { property: "og:title", content: "Southam Sloggers — Sunday Cycling Club" },
      {
        property: "og:description",
        content: "Sunday rides from Southam, Warwickshire. Coffee. Cake. Good company.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <HeroSection />
      <HomeTeasersSection />
      <SiteFooter />
    </div>
  );
}
