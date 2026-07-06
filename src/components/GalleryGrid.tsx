import { useState } from "react";
import { X } from "lucide-react";

import type { GalleryItem } from "@/lib/gallery-types";

type GalleryGridProps = {
  items: GalleryItem[];
};

export function GalleryGrid({ items }: GalleryGridProps) {
  const [active, setActive] = useState<GalleryItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-muted/40 px-8 py-16 text-center">
        <p className="display text-4xl text-primary">No photos yet</p>
        <p className="mt-3 text-muted-foreground">
          Check back soon — the Sloggers are probably out riding.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item)}
            className="group mb-5 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card text-left shadow-soft transition hover:-translate-y-1 hover:shadow-purple"
          >
            <img
              src={item.src}
              alt={item.alt}
              loading="lazy"
              className="w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            />
            {item.caption ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">{item.caption}</div>
            ) : null}
          </button>
        ))}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-primary-deep/90 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            aria-label="Close photo"
            className="absolute right-6 top-6 rounded-full border border-primary-foreground/20 p-2 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setActive(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <figure
            className="max-h-[90vh] max-w-5xl overflow-hidden rounded-3xl bg-card shadow-purple"
            onClick={(event) => event.stopPropagation()}
          >
            <img src={active.src} alt={active.alt} className="max-h-[75vh] w-full object-contain" />
            {active.caption ? (
              <figcaption className="px-6 py-4 text-center text-muted-foreground">
                {active.caption}
              </figcaption>
            ) : null}
          </figure>
        </div>
      ) : null}
    </>
  );
}
