import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/gallery", label: "Gallery" },
  { to: "/ride", label: "Ride map" },
  { to: "/about", label: "Who we are" },
  { to: "/join", label: "Join us" },
] as const;

export function SiteNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string) => {
    if (to === "/") return pathname === "/";
    return pathname === to || pathname.startsWith(`${to}/`);
  };

  const linkClass = (to: string) => {
    const active = isActive(to);
    return active
      ? "text-primary underline decoration-primary/40 underline-offset-4"
      : "text-foreground hover:text-primary transition-colors";
  };

  const mobileLinkClass = (to: string) =>
    `block rounded-xl px-4 py-3 text-sm font-medium uppercase tracking-wider transition-colors ${
      isActive(to) ? "bg-muted/60 text-primary" : "hover:bg-muted/60"
    }`;

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/95 text-foreground backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex min-w-0 shrink items-center gap-2" onClick={closeMenu}>
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-primary sm:h-3 sm:w-3" />
          <span className="display truncate text-xl tracking-wider text-primary sm:text-2xl">
            Southam Sloggers
          </span>
        </Link>

        <div className="hidden items-center gap-6 text-sm font-medium uppercase tracking-wider md:flex lg:gap-8">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className={linkClass(link.to)}>
              {link.label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-muted/60 md:hidden"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {menuOpen ? (
        <div className="border-t border-border/50 px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={mobileLinkClass(link.to)}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:px-6">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          <span className="display text-lg tracking-wider text-primary">Southam Sloggers</span>
          <span className="hidden sm:inline">· Southam, Warwickshire</span>
        </div>
        <div>© {new Date().getFullYear()} Southam Sloggers CC</div>
      </div>
    </footer>
  );
}
