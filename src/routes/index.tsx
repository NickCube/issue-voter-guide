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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BallotBrief — Know what candidates stand for, with receipts" },
      {
        name: "description",
        content:
          "Verified Somerset County primary candidates and source-backed positions for June 2, 2026.",
      },
      { property: "og:title", content: "BallotBrief — Somerset County 2026 Primary" },
      { property: "og:description", content: "Find verified Somerset County primary candidates and source-backed positions." },
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
              Somerset County · June 2, 2026
            </span>
            <h1 className="mt-8 font-display text-5xl font-bold leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-8xl">
              Know your primary
              <br />
              <span className="italic text-white/60">before you vote.</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg text-white/70 leading-relaxed sm:text-xl">
              See verified Democratic and Republican candidate filings, then
              compare only the positions tied to an original source.
            </p>
          </div>
        </section>

        {/* INTEGRATED FINDER — Overlapping the hero */}
        <div className="relative -mt-32 px-4">
          <div className="mx-auto max-w-3xl">
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
                   June 2 primary
                </p>
                <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                   Verified races
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
               Browse every verified race in the Somerset County primary.
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
      to="/races/"
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
