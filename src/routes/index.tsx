import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowUpRight,
  FileSearch,
  Scale,
  ShieldCheck,
  BookOpen,
  MapPin,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import { AddressFinder } from "@/components/address-finder";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "November 2026 Somerset Election Guide — BallotBrief" },
      {
        name: "description",
        content:
          "Official voting resources for the November 3, 2026 general election in Somerset County, New Jersey, plus the June primary archive.",
      },
      { property: "og:title", content: "BallotBrief — November 2026 Somerset Election" },
      { property: "og:description", content: "November 3 general election voting resources and a clearly separated June primary archive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function formatDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Home() {
  const { data: races = [] } = useQuery({
    queryKey: ["home-races"],
    queryFn: async () => {
      const { data } = await supabase
        .from("races")
        .select("id, name, location, election_date, office_description, is_verified")
        .eq("is_verified", true)
        .order("election_date", { ascending: true })
        .order("name", { ascending: true });
      return data ?? [];
    },
  });

  const featured = races[0];
  const rest = races.slice(1, 7);
  const totalRaces = races.length;

  return (
    <div className="min-h-screen bg-background selection:bg-primary selection:text-primary-foreground">
      <SiteHeader />

      <main>
        {/* HERO — Redesigned for focus */}
        <section className="relative overflow-hidden bg-hero-gradient text-primary-foreground pb-40 pt-20">
          <div className="absolute inset-0 grain opacity-40" aria-hidden />
          <div
            className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-20"
            style={{ background: "radial-gradient(closest-side, white, transparent)" }}
            aria-hidden
          />
          
          <div className="relative container mx-auto max-w-5xl px-4 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-md">
              <CheckCircle2 className="h-3 w-3 text-success" />
              Somerset County · November 3, 2026
            </span>
            <h1 className="mt-8 font-display text-5xl font-bold leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-8xl">
              November election
              <br />
              <span className="italic text-primary-foreground/60">Somerset County.</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg text-white/70 leading-relaxed sm:text-xl">
              Find official voting information for the general election.
              June primary candidates are archived below—not presented as November nominees.
            </p>
          </div>
        </section>

        <section className="relative -mt-28 border-b bg-background py-10">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-semibold">November voting essentials</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              <div className="border-l-4 border-primary pl-4"><CalendarDays className="h-5 w-5 text-primary" /><h3 className="mt-3 font-semibold">Election Day</h3><p className="mt-2 text-sm">Tuesday, November 3, 2026</p><Button asChild variant="link" className="mt-2 h-auto px-0"><a href="https://www.nj.gov/state/elections/vote.shtml" target="_blank" rel="noopener noreferrer">Official voter portal <ArrowUpRight className="h-4 w-4" /></a></Button></div>
              <div className="border-l-4 border-success pl-4"><MapPin className="h-5 w-5 text-success" /><h3 className="mt-3 font-semibold">In-person early voting</h3><p className="mt-2 text-sm">October 24–November 1</p><p className="mt-1 text-sm text-muted-foreground">Mon–Sat: 10 a.m.–8 p.m.<br />Sunday: 10 a.m.–6 p.m.</p><Button asChild variant="link" className="mt-2 h-auto px-0"><a href="https://www.nj.gov/state/elections/vote-early-voting.shtml" target="_blank" rel="noopener noreferrer">Find early voting locations <ArrowUpRight className="h-4 w-4" /></a></Button></div>
              <div className="border-l-4 border-warning pl-4"><FileSearch className="h-5 w-5 text-warning" /><h3 className="mt-3 font-semibold">Vote by mail</h3><p className="mt-2 text-sm">Apply by mail by October 27.</p><p className="mt-1 text-sm text-muted-foreground">In-person application deadline: November 2 at 3 p.m.</p><Button asChild variant="link" className="mt-2 h-auto px-0"><a href="https://www.nj.gov/state/elections/vote-3-ways-to-vote.shtml" target="_blank" rel="noopener noreferrer">Official ballot instructions <ArrowUpRight className="h-4 w-4" /></a></Button></div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 border-t pt-4">
              <Button asChild variant="outline"><a href="https://www.somersetcountynj.gov/government/elected-officials/county-clerk/election-division" target="_blank" rel="noopener noreferrer">County ballots & election information <ArrowUpRight className="h-4 w-4" /></a></Button>
              <Button asChild variant="outline"><a href="https://www.somersetcountynj.gov/government/affiliated-agencies/election-board/polling-place-locator" target="_blank" rel="noopener noreferrer">Find your polling place <MapPin className="h-4 w-4" /></a></Button>
              <Button asChild variant="outline"><a href="https://nj.gov/state/elections/election-information-2026.shtml" target="_blank" rel="noopener noreferrer">Official November candidate lists <FileSearch className="h-4 w-4" /></a></Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">Sources: New Jersey Division of Elections and Somerset County. Checked October 27, 2026. November race and candidate records are not yet verified in BallotBrief; use official election materials for your general-election ballot.</p>
          </div>
        </section>

        {/* June archive finder */}
        <div className="relative px-4 pt-10">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-4 text-xl font-semibold">Explore the June primary archive</h2>
            <AddressFinder />
          </div>
        </div>

        {/* TRUST SIGNALS */}
        <section className="bg-background pt-24 pb-20">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="grid gap-px overflow-hidden rounded-3xl border bg-border sm:grid-cols-2 lg:grid-cols-4 shadow-elegant">
              {[
                { icon: Scale, t: "Nonpartisan", d: "We never endorse, rank, or recommend candidates." },
                { icon: FileSearch, t: "Source-backed", d: "Every published claim links directly to its evidence." },
                 { icon: ShieldCheck, t: "Verified filings", d: "The public roster comes from the Somerset County Clerk." },
                { icon: BookOpen, t: "Honest Gaps", d: "If evidence is missing, we say so plainly." },
              ].map((f) => (
                <div key={f.t} className="bg-card p-8 group transition-colors hover:bg-muted/30">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 font-display text-lg font-bold">{f.t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED RACES */}
        <section className="bg-muted/30 py-24 border-y">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mb-12 flex items-end justify-between gap-6">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">
                   June 2, 2026 · Past election
                </p>
                <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                   Primary race archive
                </h2>
              </div>
              <Button asChild variant="link" className="hidden sm:flex group text-primary font-bold">
                <Link to="/races">
                  View all races <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              {featured && (
                <Link
                   to="/races/$raceId"
                  params={{ raceId: featured.id }}
                  className="group relative col-span-12 flex min-h-[26rem] flex-col justify-between overflow-hidden rounded-[2rem] bg-primary p-8 text-primary-foreground shadow-elegant transition-all hover:scale-[1.01] sm:p-12 lg:col-span-8"
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-40 bg-hero-gradient"
                    aria-hidden
                  />
                  <div className="relative">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-md">
                       Clerk-verified filing
                    </span>
                    <h3 className="mt-8 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl max-w-xl">
                      {featured.name}
                    </h3>
                    {featured.office_description && (
                      <p className="mt-6 max-w-lg text-white/70 text-lg leading-relaxed">
                        {featured.office_description}
                      </p>
                    )}
                  </div>
                  <div className="relative mt-8 flex flex-wrap items-center justify-between gap-6">
                    <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-white/80">
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> {featured.location}
                      </span>
                      {featured.election_date && (
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          {formatDate(featured.election_date)}
                        </span>
                      )}
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary transition-transform group-hover:rotate-45">
                      <ArrowUpRight className="h-6 w-6" />
                    </div>
                  </div>
                </Link>
              )}

              <div className="col-span-12 grid gap-6 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
                {rest.slice(0, 3).map((race) => (
                  <RaceCard key={race.id} race={race} compact />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary text-primary-foreground py-24 relative overflow-hidden">
          <div className="absolute inset-0 grain opacity-20" aria-hidden />
          <div className="container mx-auto max-w-4xl px-4 text-center relative">
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Ready to read the receipts?
            </h2>
            <p className="mt-6 text-white/70 text-lg">
               Browse verified June primary filings. These are not November ballot listings.
            </p>
            <Button asChild size="lg" className="mt-10 bg-white text-primary hover:bg-white/90 h-14 px-8 rounded-xl font-bold text-lg shadow-elegant">
              <Link to="/races">
                Browse All Races <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function RaceCard({
  race,
  compact = false,
}: {
  race: { id: string; name: string; location: string | null; election_date: string | null };
  compact?: boolean;
}) {
  return (
    <Link
      to="/races/$raceId"
      params={{ raceId: race.id }}
      className="group flex h-full flex-col justify-between rounded-3xl border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
    >
      <div>
        <h3 className={cn("font-display font-bold leading-tight", compact ? "text-xl" : "text-2xl")}>
          {race.name}
        </h3>
        {race.location && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <MapPin className="h-3.5 w-3.5 text-primary" /> {race.location}
          </p>
        )}
      </div>
      <div className="mt-6 flex items-center justify-between text-xs font-semibold">
        <span className="text-muted-foreground">
          {race.election_date ? formatDate(race.election_date) : "Election Day"}
        </span>
        <span className="inline-flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform">
          Open Race
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
