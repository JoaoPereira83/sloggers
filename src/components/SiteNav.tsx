import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

type SiteNavProps = {
  variant?: "light" | "dark";
  compact?: boolean;
};

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/gallery", label: "Gallery" },
  { to: "/ride", label: "Ride map" },
  { href: "/#about", label: "Who we are" },
  { href: "/#join", label: "Join us" },
] as const;

export function SiteNav({ variant = "light", compact = false }: SiteNavProps) {
  const isDark = variant === "dark";
  const [menuOpen, setMenuOpen] = useState(false);

  const shellClass = isDark
    ? "bg-primary-deep/90 border-primary-foreground/15 text-primary-foreground"
    : "bg-background/95 border-border/50 text-foreground";

  const linkClass = "block rounded-xl px-4 py-3 text-sm font-medium uppercase tracking-wider hover:bg-muted/60 transition-colors";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md ${shellClass}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex min-w-0 items-center gap-2" onClick={() => setMenuOpen(false)}>
          <span className="inline-block h-3 w-3 shrink-0 rounded-full bg-primary-glow" />
          <span className="display truncate text-xl tracking-wider text-primary-glow sm:text-2xl">
            {compact ? "Sloggers" : "Southam Sloggers"}
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex text-sm font-medium uppercase tracking-wider">
          {navLinks.map((link) =>
            "to" in link ? (
              <Link key={link.label} to={link.to} className="hover:text-primary-glow transition-colors">
                {link.label}
              </Link>
            ) : (
              <a key={link.label} href={link.href} className="hover:text-primary-glow transition-colors">
                {link.label}
              </a>
            ),
          )}
        </div>

        <div className="flex items-center gap-2">
          {!compact ? (
            <Link
              to="/gallery"
              className="hidden rounded-full bg-primary-glow px-5 py-2 text-sm font-semibold uppercase tracking-wider text-primary-deep hover:opacity-90 transition sm:inline-flex"
            >
              See photos
            </Link>
          ) : null}
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div className="border-t border-border/50 px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navLinks.map((link) =>
              "to" in link ? (
                <Link
                  key={link.label}
                  to={link.to}
                  className={linkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className={linkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ),
            )}
            {!compact ? (
              <Link
                to="/gallery"
                className={`${linkClass} text-primary`}
                onClick={() => setMenuOpen(false)}
              >
                See photos
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <footer
        className="border-t border-border py-4 text-center text-xs text-muted-foreground"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        © {new Date().getFullYear()} Southam Sloggers
      </footer>
    );
  }

  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          <span className="display tracking-wider text-primary text-lg">Southam Sloggers</span>
          <span className="hidden sm:inline">· Southam, Warwickshire</span>
        </div>
        <div>© {new Date().getFullYear()} Southam Sloggers CC</div>
      </div>
    </footer>
  );
}
