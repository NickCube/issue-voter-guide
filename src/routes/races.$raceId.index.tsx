import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Calendar, MapPin, ArrowRight, Users, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      return {
        race: race.data,
        candidates: candidates.data ?? [],
        issues: issues.data ?? [],
      };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-6xl px-4 py-12">
        {isLoading && <p className="text-muted-foreground">Loading race…</p>}
        {!isLoading && !data?.race && (
          <p className="text-destructive">Race not found.</p>
        )}
        {data?.race && (
          <>
            <div className="mb-10">
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Home
              </Link>
              <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
                {data.race.name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
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
              </div>
              {data.race.office_description && (
                <p className="mt-4 max-w-3xl text-muted-foreground">
                  {data.race.office_description}
                </p>
              )}
            </div>

            {/* Issues */}
            <section className="mb-12">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Compare by issue
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.issues.map((i) => (
                  <Link
                    key={i.id}
                    to="/races/$raceId/issues/$issueId"
                    params={{ raceId, issueId: i.id }}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:border-primary hover:bg-accent"
                  >
                    {i.name}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ))}
                {data.issues.length === 0 && (
                  <p className="text-sm text-muted-foreground">No issues yet.</p>
                )}
              </div>
            </section>

            {/* Candidates */}
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Candidates ({data.candidates.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.candidates.map((c) => (
                  <article
                    key={c.id}
                    className="flex flex-col rounded-xl border bg-card p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
                        {c.name
                          .split(" ")
                          .map((s) => s[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div>
                        <h3 className="font-semibold leading-tight">{c.name}</h3>
                        {c.party_or_affiliation && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {c.party_or_affiliation}
                          </p>
                        )}
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
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
