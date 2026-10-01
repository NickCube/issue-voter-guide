import { Link, useLocation } from "@tanstack/react-router";
import { ScrollText, ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary shadow-elegant">
            <ScrollText className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              BallotBrief
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Somerset 2026 · Verified
            </span>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
          <Link
            to="/races"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            All Races
          </Link>
          <Link
            to="/methodology"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Methodology
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/races"
            className="rounded-full bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            Find my ballot
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Breadcrumbs() {
  const location = useLocation();
  const paths = location.pathname.split("/").filter(Boolean);
  
  if (paths.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Link to="/" className="flex items-center hover:text-foreground">
        <Home className="h-3 w-3" />
      </Link>
      {paths.map((path, i) => {
        const isLast = i === paths.length - 1;
        const href = "/" + paths.slice(0, i + 1).join("/");
        const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " ");
        
        // Skip IDs in breadcrumbs if possible, or show "Details"
        const isId = /^[0-9a-fA-F-]{10,}$/.test(path);
        const displayLabel = isId ? "Details" : label;

        return (
          <div key={href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 opacity-50" />
            {isLast ? (
              <span className="font-semibold text-foreground truncate max-w-[120px]">
                {displayLabel}
              </span>
            ) : (
              <Link to={href as any} className="hover:text-foreground truncate max-w-[120px]">
                {displayLabel}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-muted/30">
      <div className="container mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
              BallotBrief
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground leading-relaxed">
               Verified Somerset County primary filings with plain-English,
               source-backed candidate positions.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Resources</h4>
            <nav className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground">
              <Link to="/races" className="hover:text-primary">Browse Races</Link>
              <Link to="/methodology" className="hover:text-primary">How we work</Link>
              <Link to="/admin" className="hover:text-primary text-muted-foreground/50">Admin Access</Link>
            </nav>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Mission</h4>
            <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
              BallotBrief does not endorse or rank candidates. Our goal is to 
              increase civic engagement through radical transparency.
            </p>
          </div>
        </div>
        <div className="mt-16 border-t pt-8 text-center text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
           © {new Date().getFullYear()} BallotBrief · Nonpartisan · No endorsements
        </div>
      </div>
    </footer>
  );
}
