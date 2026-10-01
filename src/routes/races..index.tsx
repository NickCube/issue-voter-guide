import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter, Breadcrumbs } from "@/components/site-chrome";
import { Calendar, MapPin, ArrowRight, Users, ListChecks, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PartyBadge } from "@/components/party-badge";
import { cn } from "@/lib/utils";

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
    <div className="min-h-screen bg-background selection:bg-primary/10">
      <SiteHeader />
      <main>
        {isLoading && (
          <div className="container mx-auto max-w-6xl px-4 py-12">
            <div className="h-64 animate-pulse rounded-3xl bg-muted" />
          </div>
        )}
        {!isLoading && !data?.race && (
          <div className="container mx-auto max-w-6xl px-4 py-12">
            <p className="text-destructive">Race not found.</p>
          </div>
        )}
        {data?.race && (
          <>
            {/* Redesigned Hero Header */}
            <section className="relative overflow-hidden border-b bg-muted/30 pb-16 pt-12">
              <div className="container mx-auto max-w-6xl px-4">
                <Breadcrumbs />
                
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {isPrimary && (
                    <span className="inline-flex items-center rounded-full bg-primary px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-md">
                      Primary Election
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground shadow-sm">
                    <Info className="h-3 w-3" />
                    Verified Coverage
                  </span>
                </div>

                <h1 className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-6xl max-w-4xl">
                  {data.race.name.replace(/\s*—\s*/g, " — ")}
                </h1>

                <div className="mt-8 flex flex-wrap gap-8 text-sm font-bold uppercase tracking-widest text-muted-foreground/70">
                  {data.race.location && (
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" /> {data.race.location}
                    </span>
                  )}
                  {data.race.election_date && (
                    <span className="inline-flex items-center gap-2 border-l pl-8 border-border">
                      <Calendar className="h-4 w-4 text-primary" />
                      {new Date(data.race.election_date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-2 border-l pl-8 border-border">
                    <Users className="h-4 w-4 text-primary" /> {data.candidates.length} candidates
                  </span>
                </div>

                {data.race.office_description && (
                  <p className="mt-8 max-w-3xl text-lg text-muted-foreground leading-relaxed">
                    {data.race.office_description}
                  </p>
                )}
              </div>
            </section>

            <div className="container mx-auto max-w-6xl px-4 py-16">
              {/* Compare by Issue — Grid Layout */}
              <section className="mb-20">
                <div className="mb-8 flex items-end justify-between border-b pb-4">
                  <h2 className="font-display text-2xl font-bold tracking-tight">
                    Compare by Issue
                  </h2>
                  <span className="hidden text-xs font-bold uppercase tracking-widest text-muted-foreground/60 sm:block">
                    Tap to view candidates side-by-side
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {data.issues.map((i) => (
                    <Link
                      key={i.id}
                      to="/races/$raceId/issues/$issueId"
                      params={{ raceId, issueId: i.id }}
                      className="group flex flex-col justify-between rounded-[1.5rem] border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
                    >
                      <h3 className="font-display text-lg font-bold group-hover:text-primary transition-colors">{i.name}</h3>
                      <div className="mt-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <span>Compare</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  ))}
                  {data.issues.length === 0 && (
                    <p className="col-span-full py-8 text-center text-sm italic text-muted-foreground">
                      No specific issues have been documented for this race yet.
                    </p>
                  )}
                </div>
              </section>

              {/* Candidates — Refined Primary Grouping */}
              <section>
                <div className="mb-8 flex flex-col gap-2">
                  <h2 className="font-display text-2xl font-bold tracking-tight">
                    Candidates
                  </h2>
                  {isPrimary && (
                    <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
                      This is a <strong className="text-foreground">closed primary</strong>. Only voters registered with a specific party can vote in that party's primary. The winners will advance to the General Election.
                    </p>
                  )}
                </div>

                {(() => {
                  const partyOf = (c: any) => {
                    const p = (c.party_or_affiliation ?? "").toLowerCase();
                    if (p.includes("democrat")) return "dem";
                    if (p.includes("republican")) return "rep";
                    return "other";
                  };
                  
                  const groupDefs = isPrimary
                    ? [
                        { key: "dem", label: "Democratic Primary", color: "text-[oklch(0.35_0.12_245)]", border: "border-[oklch(0.55_0.13_245)]/20", bg: "bg-[oklch(0.55_0.13_245)]/5", bar: "bg-[oklch(0.55_0.13_245)]" },
                        { key: "rep", label: "Republican Primary", color: "text-[oklch(0.40_0.15_25)]", border: "border-[oklch(0.55_0.18_25)]/20", bg: "bg-[oklch(0.55_0.18_25)]/5", bar: "bg-[oklch(0.55_0.18_25)]" },
                        { key: "other", label: "Other / Independent", color: "text-muted-foreground", border: "border-border", bg: "bg-muted/30", bar: "bg-muted-foreground" },
                      ]
                    : [{ key: "all", label: "", color: "", border: "", bg: "", bar: "bg-primary" }];

                  const groups = groupDefs
                    .map((g) => ({
                      ...g,
                      list: g.key === "all" ? data.candidates : data.candidates.filter((c) => partyOf(c) === g.key),
                    }))
                    .filter((g) => g.key === "all" || (isPrimary ? (g.key === "other" ? g.list.length > 0 : true) : g.list.length > 0));

                  return (
                    <div className="space-y-20">
                      {groups.map((g) => (
                        <div key={g.key}>
                          {g.label && (
                            <div className={cn("mb-8 flex items-center justify-between rounded-[1.5rem] border p-6", g.border, g.bg)}>
                              <div className="flex items-center gap-4">
                                <span className={cn("h-10 w-1.5 rounded-full shadow-sm", g.bar)} />
                                <h3 className={cn("font-display text-2xl font-bold tracking-tight", g.color)}>{g.label}</h3>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                                {g.list.length} {g.list.length === 1 ? "candidate" : "candidates"}
                              </span>
                            </div>
                          )}
                          
                          {g.list.length === 0 ? (
                            <div className="rounded-[2rem] border border-dashed p-12 text-center">
                              <p className="text-sm font-medium italic text-muted-foreground">
                                No candidates have filed for this primary yet.
                              </p>
                            </div>
                          ) : (
                            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                              {g.list.map((c) => (
                                <article
                                  key={c.id}
                                  className="group flex flex-col overflow-hidden rounded-[2rem] border bg-card shadow-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
                                >
                                  <div className="flex flex-col p-8">
                                    <div className="flex items-start gap-5">
                                      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-muted font-display text-xl font-bold text-primary shadow-sm transition-transform group-hover:scale-105">
                                        {c.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                                      </div>
                                      <div className="min-w-0">
                                        <h3 className="truncate font-display text-xl font-bold tracking-tight">{c.name}</h3>
                                        <div className="mt-2">
                                          <PartyBadge party={c.party_or_affiliation} />
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {c.bio && (
                                      <p className="mt-6 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                                        {c.bio}
                                      </p>
                                    )}

                                    {(() => {
                                      const myClaims = data.claims
                                        .filter((cl: any) => cl.candidate_id === c.id)
                                        .sort((a: any, b: any) => (a.issues?.display_order ?? 99) - (b.issues?.display_order ?? 99));
                                      
                                      if (myClaims.length === 0) return null;

                                      return (
                                        <div className="mt-8 space-y-4">
                                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Verified Positions</p>
                                          <div className="space-y-2">
                                            {myClaims.slice(0, 2).map((cl: any) => (
                                              <div key={cl.id} className="rounded-2xl border bg-muted/30 p-4">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{cl.issues?.name}</p>
                                                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-foreground/80">{cl.summary}</p>
                                              </div>
                                            ))}
                                            {myClaims.length > 2 && (
                                              <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-primary/60">
                                                + {myClaims.length - 2} more documented positions
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                    
                                    <div className="mt-auto pt-8">
                                      <Button asChild className="w-full rounded-xl font-bold" variant="secondary">
                                        <Link to="/candidates/$candidateId" params={{ candidateId: c.id }}>
                                          View Full Profile
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
