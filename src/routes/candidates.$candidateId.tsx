import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { ExternalLink, Globe } from "lucide-react";
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
        .select("*, races(id, name)")
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
          <p className="text-muted-foreground">Loading…</p>
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
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-4xl px-4 py-12">
        {c.races && (
          <Link
            to="/races/$raceId"
            params={{ raceId: c.races.id }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {c.races.name}
          </Link>
        )}

        <header className="mt-4 flex items-start gap-5">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
            {c.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
          </div>
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {c.name}
            </h1>
            {c.party_or_affiliation && (
              <p className="mt-1 text-sm text-muted-foreground">{c.party_or_affiliation}</p>
            )}
            {c.website_url && (
              <a
                href={c.website_url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Globe className="h-3.5 w-3.5" /> Candidate website
              </a>
            )}
          </div>
        </header>

        {c.bio && <p className="mt-6 max-w-2xl text-muted-foreground">{c.bio}</p>}

        <section className="mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Positions by issue
          </h2>
          <div className="space-y-4">
            {data!.claims.length === 0 && (
              <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                No approved positions on file yet.
              </p>
            )}
            {data!.claims.map((cl) => (
              <article key={cl.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{cl.issues?.name}</h3>
                  <ConfidenceBadge value={cl.confidence} />
                </div>
                <p className="mt-2 text-sm leading-relaxed">{cl.summary}</p>
                {cl.evidence_quote && (
                  <blockquote className="mt-3 border-l-2 border-primary/40 bg-muted/40 px-4 py-2 text-sm italic text-muted-foreground">
                    “{cl.evidence_quote}”
                  </blockquote>
                )}
                {cl.sources && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{cl.sources.title}</span>
                    {cl.sources.url && (
                      <a
                        href={cl.sources.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        receipt <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
                {cl.last_reviewed_at && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Last reviewed {new Date(cl.last_reviewed_at).toLocaleDateString()}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
