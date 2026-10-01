import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter, Breadcrumbs } from "@/components/site-chrome";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { ExternalLink, Globe, CalendarDays, History } from "lucide-react";
import { PartyBadge } from "@/components/party-badge";

export const Route = createFileRoute("/candidates/$candidateId")({
  component: CandidateProfile,
});

function CandidateProfile() {
  const { candidateId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: async () => {
      const cand = await supabase
        .from("candidates")
        .select("*, races(id, name, election_date)")
        .eq("id", candidateId)
        .maybeSingle();
      const claims = await supabase
        .from("position_claims")
        .select("*, issues(id, name), sources(*)")
        .eq("candidate_id", candidateId)
        .eq("status", "Approved");
      return { candidate: cand.data, claims: claims.data ?? [] };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto max-w-4xl px-4 py-12">
          <div className="h-96 animate-pulse rounded-[2rem] bg-muted" />
        </main>
      </div>
    );
  }

  const c = data?.candidate;
  if (!c) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto max-w-4xl px-4 py-12">
          <p className="text-destructive">Candidate not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/10">
      <SiteHeader />
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <Breadcrumbs />

        <header className="mt-8 flex flex-col items-start gap-8 sm:flex-row sm:items-center">
          <div className="grid h-32 w-32 shrink-0 place-items-center rounded-[2.5rem] bg-primary text-4xl font-bold text-primary-foreground shadow-elegant">
            {c.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <PartyBadge party={c.party_or_affiliation} className="px-3 py-1 text-xs" />
              {c.races?.election_date && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  Election {new Date(c.races.election_date).toLocaleDateString(undefined, { year: 'numeric' })}
                </span>
              )}
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-6xl">
              {c.name}
            </h1>
            <div className="mt-6 flex flex-wrap gap-4">
              {c.website_url && (
                <a
                  href={c.website_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-full border bg-card px-5 py-2 text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                >
                  <Globe className="h-4 w-4 text-primary" /> Official Website
                </a>
              )}
              <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-5 py-2 text-sm font-bold text-success shadow-sm">
                {data?.claims.length} Documented Positions
              </div>
            </div>
          </div>
        </header>

        {c.bio && (
          <div className="mt-12 rounded-[2rem] bg-muted/30 p-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Biography</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{c.bio}</p>
          </div>
        )}

        <section className="mt-16">
          <div className="mb-8 border-b pb-4">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Verified Positions
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every position below has been reviewed by our team and linked to its original source.
            </p>
          </div>
          
          <div className="space-y-8">
            {data!.claims.length === 0 && (
              <div className="rounded-[2rem] border border-dashed p-16 text-center">
                <p className="font-medium italic text-muted-foreground">
                  No verified positions documented for this candidate yet.
                </p>
              </div>
            )}
            {data!.claims.map((cl) => (
              <article key={cl.id} className="group relative rounded-[2rem] border bg-card p-8 shadow-card transition-all hover:border-primary/40 hover:shadow-elegant">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="font-display text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">
                    {cl.issues?.name}
                  </h3>
                  <ConfidenceBadge value={cl.confidence} />
                </div>
                
                <div className="mt-6 text-lg leading-relaxed text-foreground/90">
                  {cl.summary}
                </div>
                
                {cl.evidence_quote && (
                  <blockquote className="relative mt-8 rounded-2xl border-l-4 border-primary bg-muted/40 p-6 text-muted-foreground">
                    <span className="absolute -left-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-md">
                      “
                    </span>
                    <p className="italic leading-relaxed">{cl.evidence_quote}</p>
                  </blockquote>
                )}
                
                <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between border-t pt-8">
                  {cl.sources && (
                    <div className="max-w-md">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Primary Source</p>
                      <div className="mt-2 flex items-start gap-3">
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/20" />
                        <div>
                          <p className="font-bold text-sm text-foreground">{cl.sources.title}</p>
                          {cl.sources.url && (
                            <a
                              href={cl.sources.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                            >
                              View original receipt <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {cl.last_reviewed_at && (
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                      <History className="h-3.5 w-3.5" />
                      Verified {new Date(cl.last_reviewed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
