import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const links = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/races", label: "Races" },
  { to: "/admin/candidates", label: "Candidates" },
  { to: "/admin/issues", label: "Issues" },
  { to: "/admin/sources", label: "Sources" },
  { to: "/admin/position-claims", label: "Position Claims" },
] as const;

function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto max-w-6xl px-4 py-12">
          <p className="text-muted-foreground">Loading…</p>
        </main>
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto max-w-2xl px-4 py-16">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            Admin access required
          </h1>
          <p className="mt-2 text-muted-foreground">
            You're signed in as <strong>{user.email}</strong>, but this account does not have
            the admin role. An existing admin must grant access.
          </p>
          <div className="mt-6 flex gap-2">
            <Button asChild variant="outline">
              <Link to="/">Back to home</Link>
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/login" });
              }}
            >
              Sign out
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="border-b bg-muted/30">
        <div className="container mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-3 text-sm">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.exact ?? false }}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/login" });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
      <main className="container mx-auto max-w-6xl px-4 py-10">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
