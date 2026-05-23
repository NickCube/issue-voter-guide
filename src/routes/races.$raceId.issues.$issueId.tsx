import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/races/$raceId/issues/$issueId")({
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
          <p className="text-muted-foreground">Loading comparison…</p>
        </main>
      </div>
    );
  }

  if (!data?.issue || !data?.race) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto max-w-6xl px-4 py-12">
          <p className="text-destructive">Not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-6xl px-4 py-12">
        <Link
          to="/races/$raceId"
          params={{ raceId }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {data.race.name}
        </Link>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          {data.issue.name}
        </h1>
        {data.issue.description && (
          <p className="mt-3 max-w-3xl text-muted-foreground">{data.issue.description}</p>
        )}

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {data.candidates.map((c) => {
            const claim = data.claims.find((cl) => cl.candidate_id === c.id);
            return (
              <article
                key={c.id}
                className="flex flex-col rounded-xl border bg-card p-6 shadow-sm"
              >
                <header className="flex items-center justify-between gap-2">
                  <div>
                    <Link
                      to="/candidates/$candidateId"
                      params={{ candidateId: c.id }}
                      className="font-semibold hover:underline"
                    >
                      {c.name}
                    </Link>
                    {c.party_or_affiliation && (
                      <p className="text-xs text-muted-foreground">
                        {c.party_or_affiliation}
                      </p>
                    )}
                  </div>
                  <ConfidenceBadge
                    value={claim?.confidence ?? "No Clear Position"}
                  />
                </header>

                {claim ? (
                  <>
                    <p className="mt-4 text-sm leading-relaxed">{claim.summary}</p>

                    {claim.evidence_quote && (
                      <blockquote className="mt-4 border-l-2 border-primary/40 bg-muted/40 px-4 py-3 text-sm italic text-muted-foreground">
                        “{claim.evidence_quote}”
                      </blockquote>
                    )}

                    {claim.sources && (
                      <div className="mt-4 rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">
                          {claim.sources.title}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3">
                          {claim.sources.source_type && (
                            <span>{claim.sources.source_type}</span>
                          )}
                          {claim.sources.publication_date && (
                            <span>
                              {new Date(
                                claim.sources.publication_date,
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {claim.sources.url && (
                          <a
                            href={claim.sources.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            View receipt <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}

                    {claim.last_reviewed_at && (
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        Last reviewed{" "}
                        {new Date(claim.last_reviewed_at).toLocaleDateString()}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-4 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                    No clear public position found.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
