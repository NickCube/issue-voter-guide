import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [races, candidates, issues, sources, approved, draft] = await Promise.all([
        supabase.from("races").select("*", { count: "exact", head: true }),
        supabase.from("candidates").select("*", { count: "exact", head: true }),
        supabase.from("issues").select("*", { count: "exact", head: true }),
        supabase.from("sources").select("*", { count: "exact", head: true }),
        supabase.from("position_claims").select("*", { count: "exact", head: true }).eq("status", "Approved"),
        supabase.from("position_claims").select("*", { count: "exact", head: true }).eq("status", "Draft"),
      ]);
      return {
        races: races.count ?? 0,
        candidates: candidates.count ?? 0,
        issues: issues.count ?? 0,
        sources: sources.count ?? 0,
        approved: approved.count ?? 0,
        draft: draft.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Races", value: data?.races, to: "/admin/races" as const },
    { label: "Candidates", value: data?.candidates, to: "/admin/candidates" as const },
    { label: "Issues", value: data?.issues, to: "/admin/issues" as const },
    { label: "Sources", value: data?.sources, to: "/admin/sources" as const },
    { label: "Approved claims", value: data?.approved, to: "/admin/position-claims" as const },
    { label: "Draft claims", value: data?.draft, to: "/admin/position-claims" as const },
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Admin dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage races, candidates, issues, sources, and position claims.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {c.label}
            </div>
            <div className="mt-2 font-serif text-3xl font-semibold">
              {c.value ?? "—"}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-dashed bg-muted/30 p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="h-4 w-4" /> AI Source Extractor — Coming Soon
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Paste candidate source text and generate draft issue-position claims for human
          review. This feature is not yet available.
        </p>
      </div>
    </div>
  );
}
