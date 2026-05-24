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
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BallotBrief — Know what candidates stand for, with receipts" },
      {
        name: "description",
        content:
          "Nonpartisan candidate comparison by issue. Plain-English summaries, source links, and confidence labels.",
      },
      { property: "og:title", content: "BallotBrief" },
      {
        property: "og:description",
        content: "Compare candidates by issue with source-backed receipts.",
      },
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
        .select("id, name, location, election_date, office_description")
        .order("election_date", { ascending: true })
        .order("name", { ascending: true });
      return data ?? [];
    },
  });

  const featured = races[0];
  const rest = races.slice(1, 7);
  const totalRaces = races.length;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* HERO — dark navy editorial */}
        <section className="relative overflow-hidden bg-hero-gradient text-primary-foreground">
          <div className="absolute inset-0 grain opacity-40" aria-hidden />
          <div
            className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full blur-3xl"
            style={{ background: "radial-gradient(closest-side, color-mix(in oklab, white 18%, transparent), transparent)" }}
            aria-hidden
          />
          <div className="relative container mx-auto max-w-6xl px-4 pt-20 pb-24 sm:pt-28 sm:pb-32">
            <div className="grid items-end gap-12 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Nonpartisan · Source-backed
                </span>
                <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl">
                  Know what candidates
                  <br />
                  stand for —{" "}
                  <span className="italic text-white/70">with receipts.</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg text-white/70">
                  Compare candidates issue by issue with plain-English summaries,
                  source links, and honest confidence labels. Built for voters who
                  want the facts — not the spin.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                    <Link to="/races">
                      Browse {totalRaces || ""} Races
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link to="/methodology">How we work</Link>
                  </Button>
                </div>
              </div>

              {/* Hero stats column */}
              <div className="lg:col-span-5">
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                  <Stat label="Live races" value={totalRaces.toString()} />
                  <Stat label="Coverage" value="Morris County, NJ" />
                  <Stat label="Bias" value="None — period." />
                  <Stat label="Every claim" value="Sourced & reviewed" />
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED + GRID — magazine layout */}
        <section className="border-b bg-background">
          <div className="container mx-auto max-w-6xl px-4 py-20">
            <div className="mb-10 flex items-end justify-between gap-6">
              <div>
                <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Live races
                </p>
                <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                  On the ballot now
                </h2>
              </div>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link to="/races">
                  View all <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              {/* Featured race */}
              {featured && (
                <Link
                  to="/races/$raceId"
                  params={{ raceId: featured.id }}
                  className="group relative col-span-12 flex min-h-[22rem] flex-col justify-between overflow-hidden rounded-3xl border bg-primary p-8 text-primary-foreground shadow-elegant transition-transform hover:-translate-y-0.5 sm:p-10 lg:col-span-7"
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-50"
                    style={{ background: "radial-gradient(60% 80% at 100% 0%, color-mix(in oklab, white 12%, transparent), transparent)" }}
                    aria-hidden
                  />
                  <div className="relative">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
                      Featured race
                    </span>
                    <h3 className="mt-6 font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
                      {featured.name}
                    </h3>
                    {featured.office_description && (
                      <p className="mt-4 max-w-lg text-white/70">
                        {featured.office_description}
                      </p>
                    )}
                  </div>
                  <div className="relative mt-8 flex flex-wrap items-center justify-between gap-4 text-sm text-white/70">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" /> {featured.location}
                      </span>
                      {featured.election_date && (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" />
                          {formatDate(featured.election_date)}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 font-medium text-white">
                      Open race
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              )}

              {/* Side grid */}
              <div className="col-span-12 grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
                {rest.slice(0, 3).map((race) => (
                  <RaceCard key={race.id} race={race} compact />
                ))}
              </div>

              {/* Bottom row */}
              {rest.slice(3, 7).map((race) => (
                <div key={race.id} className="col-span-12 sm:col-span-6 lg:col-span-3">
                  <RaceCard race={race} />
                </div>
              ))}
            </div>

            <div className="mt-10 flex justify-center sm:hidden">
              <Button asChild variant="outline">
                <Link to="/races">View all races</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="border-b">
          <div className="container mx-auto max-w-6xl px-4 py-24">
            <div className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Method
                </p>
                <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                  Three steps. No spin.
                </h2>
                <p className="mt-5 max-w-md text-muted-foreground">
                  Every position on BallotBrief is reviewed by a human and linked
                  back to its source. We don't rank, endorse, or recommend.
                </p>
              </div>
              <ol className="grid gap-4 lg:col-span-8 sm:grid-cols-3">
                {[
                  { n: "01", t: "Choose a race", d: "Pick an election you care about." },
                  { n: "02", t: "Pick an issue", d: "Housing, Taxes, Schools, Transit, and more." },
                  { n: "03", t: "Compare with evidence", d: "Plain-English summaries with source-backed receipts." },
                ].map((s) => (
                  <li
                    key={s.n}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <span className="font-display text-5xl font-semibold leading-none text-primary/15">
                      {s.n}
                    </span>
                    <div className="mt-12">
                      <h3 className="font-display text-lg font-semibold">{s.t}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section className="bg-muted/40">
          <div className="container mx-auto max-w-6xl px-4 py-24">
            <div className="mb-10 max-w-xl">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Our promise
              </p>
              <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">
                Built on evidence, not opinion.
              </h2>
            </div>
            <div className="grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Scale, t: "Nonpartisan", d: "We don't endorse, rank, or recommend candidates." },
                { icon: FileSearch, t: "Source-backed", d: "Every published claim links to its evidence." },
                { icon: ShieldCheck, t: "Human review", d: "Claims are reviewed before they appear publicly." },
                { icon: BookOpen, t: "Honest gaps", d: "When we lack evidence, we say so plainly." },
              ].map((f) => (
                <div key={f.t} className="bg-card p-7">
                  <f.icon className="h-5 w-5 text-accent" />
                  <h3 className="mt-4 font-display font-semibold">{f.t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary text-primary-foreground">
          <div className="container mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Ready to read the receipts?
              </h2>
              <p className="mt-2 text-white/70">
                Browse every live race we cover.
              </p>
            </div>
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
              <Link to="/races">
                Browse races <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-transparent p-5">
      <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/55">
        {label}
      </dt>
      <dd className="mt-2 font-display text-xl font-semibold text-white">{value}</dd>
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
      className="group flex h-full flex-col justify-between rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40"
    >
      <div>
        <h3 className={`font-display font-semibold leading-tight ${compact ? "text-base" : "text-lg"}`}>
          {race.name}
        </h3>
        {race.location && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {race.location}
          </p>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        {race.election_date ? <span>{formatDate(race.election_date)}</span> : <span />}
        <span className="inline-flex items-center gap-1 font-medium text-primary">
          Open
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
