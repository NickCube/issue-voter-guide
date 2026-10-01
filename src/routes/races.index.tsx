import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, MapPin, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RacesMap } from "@/components/races-map";
import { formatElectionDate } from "@/lib/election";

export const Route = createFileRoute("/races/")({
  head: () => ({ meta: [
    { title: "2026 Somerset County Primary Races — BallotBrief" },
    { name: "description", content: "Browse verified June 2, 2026 Somerset County primary races and candidates." },
    { property: "og:title", content: "2026 Somerset County Primary Races — BallotBrief" },
    { property: "og:description", content: "Verified primary filings and source-backed candidate positions for Somerset County voters." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: RacesPage,
});

type RaceSummary = {
  id: string; name: string; location: string | null; election_date: string | null;
  filing_instruction: string | null; election_type: string; is_verified: boolean;
  candidateCount: number; demCount: number; repCount: number; claimCount: number;
};

function RacesPage() {
  const [query, setQuery] = useState("");
  const { data: races = [], isLoading } = useQuery({
    queryKey: ["verified-races-list"],
    queryFn: async (): Promise<RaceSummary[]> => {
      const [racesRes, candidatesRes, claimsRes] = await Promise.all([
        supabase.from("races").select("id, name, location, election_date, filing_instruction, election_type, is_verified").eq("is_verified", true).order("name"),
        supabase.from("candidates").select("id, race_id, party_or_affiliation, is_verified").eq("is_verified", true),
        supabase.from("position_claims").select("id, candidate_id").eq("status", "Approved").not("source_id", "is", null),
      ]);
      const candidates = candidatesRes.data ?? [];
      const raceByCandidate = new Map(candidates.map((candidate) => [candidate.id, candidate.race_id]));
      return (racesRes.data ?? []).map((race) => {
        const list = candidates.filter((candidate) => candidate.race_id === race.id);
        return {
          ...race,
          candidateCount: list.length,
          demCount: list.filter((candidate) => candidate.party_or_affiliation?.toLowerCase().includes("democrat")).length,
          repCount: list.filter((candidate) => candidate.party_or_affiliation?.toLowerCase().includes("republican")).length,
          claimCount: (claimsRes.data ?? []).filter((claim) => raceByCandidate.get(claim.candidate_id) === race.id).length,
        };
      });
    },
  });
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? races.filter((race) => `${race.name} ${race.location ?? ""}`.toLowerCase().includes(needle)) : races;
  }, [query, races]);

  return <div className="min-h-screen bg-background"><SiteHeader /><main>
    <section className="border-b bg-primary text-primary-foreground">
      <div className="container mx-auto max-w-6xl px-4 py-14 sm:py-18">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase"><CheckCircle2 className="h-4 w-4 text-success" /> Verified candidate filings</div>
        <h1 className="mt-4 text-4xl font-semibold sm:text-6xl">Somerset County primary</h1>
        <p className="mt-4 max-w-2xl text-primary-foreground/75">Democratic and Republican contests for June 2, 2026, based on the Somerset County Clerk candidate roster.</p>
      </div>
    </section>
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <div className="relative mb-8 max-w-xl"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by office or town" className="h-11 pl-10" /></div>
      {!isLoading && <div className="mb-10"><RacesMap races={filtered} /></div>}
      <div className="mb-5 flex items-baseline justify-between"><h2 className="text-2xl font-semibold">{filtered.length} verified races</h2><span className="text-sm text-muted-foreground">Primary election</span></div>
      {isLoading ? <p className="text-muted-foreground">Loading verified races…</p> : <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((race) => <article key={race.id} className="flex flex-col border-t-4 border-t-primary bg-card p-6 shadow-card">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase text-muted-foreground"><span className="rounded-md bg-primary px-2 py-1 text-primary-foreground">Primary</span>{race.filing_instruction && <span className="rounded-md border px-2 py-1">{race.filing_instruction}</span>}</div>
          <h3 className="mt-4 text-xl font-semibold leading-snug">{race.name}</h3>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">{race.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{race.location}</span>}<span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{formatElectionDate(race.election_date)}</span></div>
          <div className="mt-5 grid grid-cols-2 gap-2"><div className="border-l-4 border-democrat bg-democrat/10 px-3 py-2"><strong className="block text-democrat-foreground">{race.demCount}</strong><span className="text-xs text-muted-foreground">Democratic candidates</span></div><div className="border-l-4 border-republican bg-republican/10 px-3 py-2"><strong className="block text-republican-foreground">{race.repCount}</strong><span className="text-xs text-muted-foreground">Republican candidates</span></div></div>
          <div className="mt-5 flex items-center justify-between border-t pt-4"><span className="text-xs text-muted-foreground">{race.claimCount} source-backed positions</span><Button asChild size="sm"><Link to="/races/$raceId" params={{ raceId: race.id }}>View candidates</Link></Button></div>
        </article>)}
      </div>}
    </div>
  </main><SiteFooter /></div>;
}