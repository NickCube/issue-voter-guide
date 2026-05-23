import { Link } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <ScrollText className="h-4 w-4" />
          </span>
          <span className="text-lg">BallotBrief</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/methodology"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Methodology
          </Link>
          <Link
            to="/admin"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-muted/40">
      <div className="container mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium text-foreground">BallotBrief</p>
          <p>BallotBrief is nonpartisan and does not endorse candidates.</p>
        </div>
        <p className="mt-3 text-xs">
          Plain-English summaries with sources. We never tell you who to vote for.
        </p>
      </div>
    </footer>
  );
}
