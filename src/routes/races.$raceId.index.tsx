import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Calendar, MapPin, ArrowRight, Users, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PartyBadge } from "@/components/party-badge";

export const Route = createFileRoute("/races/$raceId/")({
  component: RaceDetail,
});

function RaceDetail() {
  const { raceId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["race", raceId],
    queryFn: async () => {
      const [race, candidates, issues] = await Promise.all([
        supabase.from("races").select("*").eq("id", raceId).maybeSingle(),
        supabase.from("candidates").select("*").eq("race_id", raceId).order("name"),
        supabase
          .from("issues")
          .select("*")
          .eq("race_id", raceId)
          .order("display_order"),
      ]);
      const candidateIds = (candidates.data ?? []).map((c) => c.id);
      const claims = candidateIds.length
        ? await supabase
            .from("position_claims")
            .select("id, candidate_id, issue_id, summary, evidence_quote, confidence, issues(name, display_order)")
            .in("candidate_id", candidateIds)
            .eq("status", "Approved")
        : { data: [] as any[] };
      return {
        race: race.data,
        candidates: candidates.data ?? [],
        issues: issues.data ?? [],
        claims: (claims.data ?? []) as any[],
      };
    },
  });

  const isPrimary = /primary/i.test(data?.race?.office_description ?? "") ||
    /primary/i.test(data?.race?.name ?? "");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {isLoading && (
          <div className="container mx-auto max-w-6xl px-4 py-12">
            <p className="text-muted-foreground">Loading race…</p>
          </div>
        )}
        {!isLoading && !data?.race && (
          <div className="container mx-auto max-w-6xl px-4 py-12">
            <p className="text-destructive">Race not found.</p>
          </div>
        )}
        {data?.race && (
          <>
            {/* Hero */}
            <section className="border-b bg-gradient-to-b from-accent/40 via-accent/10 to-background">
              <div className="container mx-auto max-w-6xl px-4 py-12 sm:py-16">
                <Link
                  to="/races"
                  className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  ← All races
                </Link>
                <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
                  {data.race.name}
                </h1>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  {data.race.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" /> {data.race.location}
                    </span>
                  )}
                  {data.race.election_date && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {new Date(data.race.election_date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> {data.candidates.length} candidates
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4" /> {data.issues.length} issues
                  </span>
                </div>
                {data.race.office_description && (
                  <p className="mt-5 max-w-3xl text-muted-foreground">
                    {data.race.office_description}
                  </p>
                )}
              </div>
            </section>

            <div className="container mx-auto max-w-6xl px-4 py-12">
              {/* Issues */}
              <section className="mb-14">
                <div className="mb-4 flex items-end justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Compare by issue
                  </h2>
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    Tap an issue to compare candidates side-by-side
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.issues.map((i) => (
                    <Link
                      key={i.id}
                      to="/races/$raceId/issues/$issueId"
                      params={{ raceId, issueId: i.id }}
                      className="group inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-accent hover:shadow-md"
                    >
                      {i.name}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                  {data.issues.length === 0 && (
                    <p className="text-sm text-muted-foreground">No issues yet.</p>
                  )}
                </div>
              </section>

              {/* Candidates */}
              <section>
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Candidates
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.candidates.map((c) => (
                    <article
                      key={c.id}
                      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="h-1.5 w-full bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />
                      <div className="flex flex-col p-6">
                        <div className="flex items-start gap-4">
                          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-muted to-accent/40 font-serif text-lg font-semibold text-primary ring-1 ring-border">
                            {c.name
                              .split(" ")
                              .map((s) => s[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold leading-tight">{c.name}</h3>
                            <div className="mt-1.5">
                              <PartyBadge party={c.party_or_affiliation} />
                            </div>
                          </div>
                        </div>
                        {c.bio && (
                          <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">
                            {c.bio}
                          </p>
                        )}
                        <div className="mt-auto pt-5">
                          <Button asChild size="sm" variant="outline" className="w-full">
                            <Link
                              to="/candidates/$candidateId"
                              params={{ candidateId: c.id }}
                            >
                              View profile
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
