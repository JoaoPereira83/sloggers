import { createFileRoute } from "@tanstack/react-router";

import { GalleryGrid } from "@/components/GalleryGrid";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { getGalleryItems } from "@/lib/gallery.server";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Southam Sloggers" },
      {
        name: "description",
        content: "Photos from Sunday rides, cafe stops, and life in purple with the Southam Sloggers.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  loader: () => getGalleryItems(),
  component: GalleryPage,
});

function GalleryPage() {
  const items = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="pt-[calc(5rem+env(safe-area-inset-top))] pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Ride memories
            </div>
            <h1 className="mt-3 display text-6xl leading-none md:text-8xl">
              Sunday miles.
              <br />
              <span className="text-primary">Captured.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              A rolling collection of group rides, Warwickshire lanes, and the all-important cafe stop.
            </p>
          </div>

          <div className="mt-14">
            <GalleryGrid items={items} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
