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
      const tables = ["races", "candidates", "issues", "sources"] as const;
      const counts: Record<string, number> = {};
      for (const t of tables) {
        const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
        counts[t] = count ?? 0;
      }
      const { count: approved } = await supabase
        .from("position_claims")
        .select("*", { count: "exact", head: true })
        .eq("status", "Approved");
      const { count: draft } = await supabase
        .from("position_claims")
        .select("*", { count: "exact", head: true })
        .eq("status", "Draft");
      return { ...counts, approved: approved ?? 0, draft: draft ?? 0 };
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
