import { Link } from "@tanstack/react-router";

type SiteNavProps = {
  variant?: "light" | "dark";
};

export function SiteNav({ variant = "light" }: SiteNavProps) {
  const isDark = variant === "dark";

  return (
    <header
      className={`fixed top-0 z-50 w-full backdrop-blur-md border-b ${
        isDark
          ? "bg-primary-deep/90 border-primary-foreground/15 text-primary-foreground"
          : "bg-background/80 border-border/50 text-foreground"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-primary-glow" />
          <span className="display text-2xl tracking-wider text-primary-glow">Southam Sloggers</span>
        </Link>
        <div className="hidden gap-8 md:flex text-sm font-medium uppercase tracking-wider">
          <Link to="/" className="hover:text-primary-glow transition-colors">
            Home
          </Link>
          <Link to="/gallery" className="hover:text-primary-glow transition-colors">
            Gallery
          </Link>
          <Link to="/ride" className="hover:text-primary-glow transition-colors">
            Ride map
          </Link>
          <a href="/#about" className="hover:text-primary-glow transition-colors">
            Who we are
          </a>
          <a href="/#join" className="hover:text-primary-glow transition-colors">
            Join us
          </a>
        </div>
        <Link
          to="/gallery"
          className="rounded-full bg-primary-glow px-5 py-2 text-sm font-semibold uppercase tracking-wider text-primary-deep hover:opacity-90 transition"
        >
          See photos
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          <span className="display tracking-wider text-primary text-lg">Southam Sloggers</span>
          <span>· Southam, Warwickshire</span>
        </div>
        <div>© {new Date().getFullYear()} Southam Sloggers CC</div>
      </div>
    </footer>
  );
}
