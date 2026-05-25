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
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {isPrimary && (
                    <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
                      Primary Election
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                    Only registered party members can vote
                  </span>
                </div>
                <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
                  {data.race.name.replace(/\s*—\s*/g, " — ")}
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
                  {isPrimary ? "Candidates by party primary" : "Candidates"}
                </h2>
                {isPrimary && (
                  <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
                    This is a <strong className="text-foreground">closed primary</strong>: only voters registered with that party can vote in that party's primary. The winners of each party's primary advance to the November general election.
                  </p>
                )}
                {(() => {
                  const partyOf = (c: any) => {
                    const p = (c.party_or_affiliation ?? "").toLowerCase();
                    if (p.includes("democrat")) return "dem";
                    if (p.includes("republican")) return "rep";
                    return "other";
                  };
                  const groupDefs = isPrimary
                    ? [
                        { key: "dem", label: "Democratic Primary", sub: "Vote if registered Democrat", bar: "bg-[oklch(0.55_0.13_245)]", text: "text-[oklch(0.35_0.12_245)] dark:text-[oklch(0.85_0.10_245)]", border: "border-[oklch(0.55_0.13_245)]/40 bg-[oklch(0.55_0.13_245)]/5" },
                        { key: "rep", label: "Republican Primary", sub: "Vote if registered Republican", bar: "bg-[oklch(0.55_0.18_25)]", text: "text-[oklch(0.40_0.15_25)] dark:text-[oklch(0.85_0.12_25)]", border: "border-[oklch(0.55_0.18_25)]/40 bg-[oklch(0.55_0.18_25)]/5" },
                        { key: "other", label: "Other / Independent", sub: "", bar: "bg-muted-foreground", text: "text-muted-foreground", border: "border-border bg-muted/30" },
                      ]
                    : [{ key: "all", label: "", sub: "", bar: "bg-primary/60", text: "", border: "" }];

                  const groups = groupDefs
                    .map((g) => ({
                      ...g,
                      list: g.key === "all" ? data.candidates : data.candidates.filter((c) => partyOf(c) === g.key),
                    }))
                    .filter((g) => g.key === "all" || isPrimary ? true : g.list.length > 0)
                    .filter((g) => !(isPrimary && g.key === "other" && g.list.length === 0));

                  return (
                    <div className="space-y-10">
                      {groups.map((g) => (
                        <div key={g.key}>
                          {g.label && (
                            <div className={`mb-4 flex items-center justify-between rounded-xl border p-4 ${g.border}`}>
                              <div className="flex items-center gap-3">
                                <span className={`h-8 w-1.5 rounded-full ${g.bar}`} />
                                <div>
                                  <h3 className={`font-serif text-xl font-semibold ${g.text}`}>{g.label}</h3>
                                  {g.sub && <p className="text-xs text-muted-foreground">{g.sub}</p>}
                                </div>
                              </div>
                              <span className="text-xs font-medium text-muted-foreground">
                                {g.list.length} {g.list.length === 1 ? "candidate" : "candidates"}
                              </span>
                            </div>
                          )}
                          {g.list.length === 0 ? (
                            <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-sm italic text-muted-foreground">
                              No candidates filed for this primary.
                            </p>
                          ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              {g.list.map((c) => (
                                <article
                                  key={c.id}
                                  className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                                >
                                  <div className={`h-1.5 w-full ${g.bar || "bg-primary/60"}`} />
                                  <div className="flex flex-col p-6">
                                    <div className="flex items-start gap-4">
                                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-muted to-accent/40 font-serif text-lg font-semibold text-primary ring-1 ring-border">
                                        {c.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                                      </div>
                                      <div className="min-w-0">
                                        <h3 className="truncate font-semibold leading-tight">{c.name}</h3>
                                        <div className="mt-1.5">
                                          <PartyBadge party={c.party_or_affiliation} />
                                        </div>
                                      </div>
                                    </div>
                                    {c.bio && (
                                      <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{c.bio}</p>
                                    )}
                                    {(() => {
                                      const myClaims = data.claims
                                        .filter((cl: any) => cl.candidate_id === c.id)
                                        .sort((a: any, b: any) => (a.issues?.display_order ?? 99) - (b.issues?.display_order ?? 99));
                                      if (myClaims.length === 0) {
                                        return (
                                          <p className="mt-4 text-xs italic text-muted-foreground">No public positions recorded yet.</p>
                                        );
                                      }
                                      return (
                                        <div className="mt-4 space-y-2.5">
                                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Where they stand</p>
                                          {myClaims.slice(0, 3).map((cl: any) => (
                                            <div key={cl.id} className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                                              <p className="text-[11px] font-semibold text-primary">{cl.issues?.name}</p>
                                              <p className="mt-0.5 line-clamp-2 text-xs text-foreground/80">{cl.summary}</p>
                                            </div>
                                          ))}
                                          {myClaims.length > 3 && (
                                            <p className="text-[11px] text-muted-foreground">+{myClaims.length - 3} more on profile</p>
                                          )}
                                        </div>
                                      );
                                    })()}
                                    <div className="mt-auto pt-5">
                                      <Button asChild size="sm" variant="outline" className="w-full">
                                        <Link to="/candidates/$candidateId" params={{ candidateId: c.id }}>
                                          View full profile & sources
                                        </Link>
                                      </Button>
                                    </div>
                                  </div>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </section>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
