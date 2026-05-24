import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { RacesMap } from "@/components/races-map";

export const Route = createFileRoute("/races/")({
  head: () => ({
    meta: [
      { title: "Races — BallotBrief" },
      {
        name: "description",
        content: "Browse source-backed candidate comparisons by race.",
      },
    ],
  }),
  component: RacesPage,
});

type RaceSummary = {
  id: string;
  name: string;
  location: string | null;
  election_date: string | null;
  office_description: string | null;
  candidateCount: number;
  issueCount: number;
  claimCount: number;
};

function RacesPage() {
  const { data: races = [], isLoading } = useQuery({
    queryKey: ["races-list"],
    queryFn: async (): Promise<RaceSummary[]> => {
      const [racesRes, candidatesRes, issuesRes, claimsRes] = await Promise.all([
        supabase
          .from("races")
          .select("id, name, location, election_date, office_description")
          .order("election_date", { ascending: true })
          .order("name", { ascending: true }),
        supabase.from("candidates").select("id, race_id"),
        supabase.from("issues").select("id, race_id"),
        supabase.from("position_claims").select("id, candidate_id").eq("status", "Approved"),
      ]);

      const candidates = candidatesRes.data ?? [];
      const issues = issuesRes.data ?? [];
      const raceByCandidate = new Map(candidates.map((c) => [c.id, c.race_id]));

      return (racesRes.data ?? []).map((race) => ({
        ...race,
        candidateCount: candidates.filter((c) => c.race_id === race.id).length,
        issueCount: issues.filter((i) => i.race_id === race.id).length,
        claimCount: (claimsRes.data ?? []).filter(
          (claim) => raceByCandidate.get(claim.candidate_id) === race.id,
        ).length,
      }));
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Races</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Browse the live races already loaded with candidates, issues, and approved source-backed
            positions.
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading races…</p>
        ) : (
          <>
            <div className="mb-8">
              <RacesMap races={races} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
            {races.map((race) => (
              <article key={race.id} className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  {race.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" /> {race.location}
                    </span>
                  )}
                  {race.election_date && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {new Date(race.election_date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
                {(() => {
                  const isPrimary = /primary/i.test(race.office_description ?? "") || /primary/i.test(race.name);
                  return isPrimary ? (
                    <span className="mt-3 inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                      Primary · June 2 2026
                    </span>
                  ) : null;
                })()}
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{race.name}</h2>
                {race.office_description && (
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                    {race.office_description}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-3 py-1">
                    {race.candidateCount} candidates
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1">{race.issueCount} issues</span>
                  <span className="rounded-full bg-muted px-3 py-1">
                    {race.claimCount} sourced positions
                  </span>
                </div>
                <Button asChild className="mt-6" size="sm">
                  <Link to="/races/$raceId" params={{ raceId: race.id }}>
                    Open race <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </article>
            ))}
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
