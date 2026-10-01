import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter, Breadcrumbs } from "@/components/site-chrome";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { ExternalLink, Users, History, ArrowLeft } from "lucide-react";
import { PartyBadge } from "@/components/party-badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/races/issues/")({
  component: IssueComparison,
});

function IssueComparison() {
  const { raceId, issueId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["compare", raceId, issueId],
    queryFn: async () => {
      const [race, issue, candidates, claims] = await Promise.all([
        supabase.from("races").select("id, name").eq("id", raceId).maybeSingle(),
        supabase.from("issues").select("*").eq("id", issueId).maybeSingle(),
        supabase.from("candidates").select("*").eq("race_id", raceId).order("name"),
        supabase
          .from("position_claims")
          .select("*, sources(*)")
          .eq("issue_id", issueId)
          .eq("status", "Approved"),
      ]);
      return {
        race: race.data,
        issue: issue.data,
        candidates: candidates.data ?? [],
        claims: claims.data ?? [],
      };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto max-w-6xl px-4 py-12">
          <div className="h-96 animate-pulse rounded-[2rem] bg-muted" />
        </main>
      </div>
    );
  }

  if (!data?.issue || !data?.race) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto max-w-6xl px-4 py-12">
          <p className="text-destructive">Comparison not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/10">
      <SiteHeader />
      <main className="container mx-auto max-w-6xl px-4 py-12">
        <Breadcrumbs />
        
        <header className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between border-b pb-12">
          <div className="max-w-3xl">
            <Link
              to="/races/$raceId"
              params={{ raceId }}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:underline"
            >
              <ArrowLeft className="h-3 w-3" /> Back to {data.race.name}
            </Link>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-6xl">
              {data.issue.name}
            </h1>
            {data.issue.description && (
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                {data.issue.description}
              </p>
            )}
          </div>
          <div className="flex h-16 items-center gap-3 rounded-2xl bg-muted/30 px-6 font-display text-lg font-bold">
            <Users className="h-5 w-5 text-primary" />
            {data.candidates.length} Candidates Compared
          </div>
        </header>

        <div className="mt-16 grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
          {data.candidates.map((c) => {
            const claim = data.claims.find((cl) => cl.candidate_id === c.id);
            return (
              <article
                key={c.id}
                className="flex flex-col rounded-[2rem] border bg-card p-8 shadow-card transition-all hover:border-primary/40 hover:shadow-elegant"
              >
                <header className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <Link
                      to="/candidates/$candidateId"
                      params={{ candidateId: c.id }}
                      className="font-display text-2xl font-bold tracking-tight hover:text-primary transition-colors truncate"
                    >
                      {c.name}
                    </Link>
                    <ConfidenceBadge
                      value={claim?.confidence ?? "No Clear Position"}
                    />
                  </div>
                  <div>
                    <PartyBadge party={c.party_or_affiliation} />
                  </div>
                </header>

                <div className="mt-8 flex-1">
                  {claim ? (
                    <>
                      <div className="text-base leading-relaxed text-foreground/90">
                        {claim.summary}
                      </div>

                      {claim.evidence_quote && (
                        <blockquote className="relative mt-8 rounded-2xl border-l-4 border-primary bg-muted/40 p-5 text-sm italic text-muted-foreground">
                          <span className="absolute -left-2.5 -top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[10px]">
                            “
                          </span>
                          “{claim.evidence_quote}”
                        </blockquote>
                      )}

                      {claim.sources && (
                        <div className="mt-8 rounded-2xl border bg-muted/20 p-5 text-xs">
                          <p className="font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Primary Evidence</p>
                          <div className="font-bold text-foreground leading-snug">
                            {claim.sources.title}
                          </div>
                          {claim.sources.url && (
                            <a
                              href={claim.sources.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="mt-3 inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
                            >
                              View receipt <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      )}

                      {claim.last_reviewed_at && (
                        <div className="mt-8 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                          <History className="h-3.5 w-3.5" />
                          Verified {new Date(claim.last_reviewed_at).toLocaleDateString()}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full flex-col justify-center rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
                      <p className="text-sm font-medium italic text-muted-foreground">
                        No clear public position has been documented for this candidate yet.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="mt-8">
                  <Button asChild variant="outline" className="w-full rounded-xl font-bold">
                    <Link to="/candidates/$candidateId" params={{ candidateId: c.id }}>
                      View Full Profile
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
