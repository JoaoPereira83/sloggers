import type { ReactNode } from "react";

import { SiteFooter, SiteNav } from "@/components/SiteNav";

type PageShellProps = {
  children: ReactNode;
  mainClassName?: string;
};

export function PageShell({
  children,
  mainClassName = "pt-[calc(5rem+env(safe-area-inset-top))] pb-24",
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className={mainClassName}>{children}</main>
      <SiteFooter />
    </div>
  );
}
