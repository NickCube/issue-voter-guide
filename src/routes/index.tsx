import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileSearch, Scale, ShieldCheck, BookOpen } from "lucide-react";

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

function Home() {
  const { data: races = [] } = useQuery({
    queryKey: ["home-races"],
    queryFn: async () => {
      const { data } = await supabase
        .from("races")
        .select("id, name, location, election_date")
        .order("election_date", { ascending: true })
        .order("name", { ascending: true });
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="border-b bg-gradient-to-b from-accent/30 to-background">
          <div className="container mx-auto max-w-5xl px-4 py-20 text-center sm:py-28">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Nonpartisan · Source-backed
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Know what candidates stand for — <span className="text-primary">with receipts.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              Compare candidates by issue using plain-English summaries, source links, and
              confidence labels.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/races">
                  Browse Races <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/methodology">How we work</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Races */}
        <section className="container mx-auto max-w-5xl px-4 py-16">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Live races</h2>
              <p className="mt-2 text-muted-foreground">
                Real races already loaded with sourced positions.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/races">View all</Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {races.map((race) => (
              <Link
                key={race.id}
                to="/races/$raceId"
                params={{ raceId: race.id }}
                className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
              >
                <h3 className="font-semibold leading-tight">{race.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{race.location}</p>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  {race.election_date && (
                    <span>
                      {new Date(race.election_date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 font-medium text-primary opacity-80 transition-opacity group-hover:opacity-100">
                    Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto max-w-5xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
            <p className="mt-2 text-muted-foreground">Three steps. No spin.</p>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { n: 1, t: "Choose a race", d: "Pick an election you care about." },
              { n: 2, t: "Pick an issue", d: "Housing, Taxes, Schools, Transit, and more." },
              {
                n: 3,
                t: "Compare with evidence",
                d: "Read plain-English summaries with source-backed receipts.",
              },
            ].map((s) => (
              <li
                key={s.n}
                className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 grid h-9 w-9 place-items-center rounded-md bg-primary font-serif text-base font-semibold text-primary-foreground">
                  {s.n}
                </div>
                <h3 className="text-lg font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Trust */}
        <section className="border-t bg-muted/40">
          <div className="container mx-auto max-w-5xl px-4 py-20">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Scale,
                  t: "Nonpartisan",
                  d: "We don't endorse, rank, or recommend candidates.",
                },
                {
                  icon: FileSearch,
                  t: "Source-backed",
                  d: "Every published claim links to its evidence.",
                },
                {
                  icon: ShieldCheck,
                  t: "Human review",
                  d: "Claims are reviewed before they appear publicly.",
                },
                {
                  icon: BookOpen,
                  t: "Honest gaps",
                  d: "When we lack evidence, we say so plainly.",
                },
              ].map((f) => (
                <div key={f.t} className="rounded-xl bg-card p-6 shadow-sm">
                  <f.icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-3 font-semibold">{f.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
