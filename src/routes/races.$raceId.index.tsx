import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, CheckCircle2, ExternalLink, MapPin, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { PartyBadge } from "@/components/party-badge";
import { formatElectionDate, partyKey } from "@/lib/election";

export const Route = createFileRoute("/races/$raceId/")({
  head: () => ({ meta: [
    { title: "Verified Primary Race — BallotBrief" },
    { name: "description", content: "Compare verified Somerset County primary candidates and source-backed positions." },
    { property: "og:title", content: "Verified Primary Race — BallotBrief" },
    { property: "og:description", content: "Compare Democratic and Republican primary candidates with original sources." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: RaceDetail,
});

function RaceDetail() {
  const { raceId } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["verified-race", raceId],
    queryFn: async () => {
      const [race, candidates, issues] = await Promise.all([
        supabase.from("races").select("*").eq("id", raceId).eq("is_verified", true).maybeSingle(),
        supabase.from("candidates").select("*").eq("race_id", raceId).eq("is_verified", true).order("name"),
        supabase.from("issues").select("*").eq("race_id", raceId).order("display_order"),
      ]);
      const candidateIds = (candidates.data ?? []).map((candidate) => candidate.id);
      const claims = candidateIds.length ? await supabase.from("position_claims")
        .select("id, candidate_id, issue_id, summary, confidence, last_reviewed_at, issues(name, display_order), sources(title, url, source_type)")
        .in("candidate_id", candidateIds).eq("status", "Approved").not("source_id", "is", null) : { data: [] };
      return { race: race.data, candidates: candidates.data ?? [], issues: issues.data ?? [], claims: claims.data ?? [] };
    },
  });

  if (isLoading) return <PageMessage text="Loading verified race…" />;
  if (!data?.race) return <PageMessage text="This race is not verified or could not be found." />;
  const groups = [
    { key: "dem", title: "Democratic primary", note: "Candidates seeking the Democratic nomination", color: "border-democrat", tone: "bg-democrat/10", text: "text-democrat-foreground" },
    { key: "rep", title: "Republican primary", note: "Candidates seeking the Republican nomination", color: "border-republican", tone: "bg-republican/10", text: "text-republican-foreground" },
  ].map((group) => ({ ...group, candidates: data.candidates.filter((candidate) => partyKey(candidate.party_or_affiliation) === group.key) }));

  return <div className="min-h-screen bg-background"><SiteHeader /><main>
    <section className="border-b bg-primary text-primary-foreground"><div className="container mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <Link to="/races" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">← All verified races</Link>
      <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-md bg-primary-foreground px-2.5 py-1 text-xs font-bold uppercase text-primary">Primary election</span><span className="inline-flex items-center gap-1 rounded-md border border-primary-foreground/20 px-2.5 py-1 text-xs"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Clerk roster verified</span>{data.race.filing_instruction && <span className="rounded-md border border-primary-foreground/20 px-2.5 py-1 text-xs">{data.race.filing_instruction}</span>}</div>
      <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight sm:text-6xl">{data.race.name}</h1>
      <div className="mt-5 flex flex-wrap gap-5 text-sm text-primary-foreground/75">{data.race.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{data.race.location}</span>}<span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{formatElectionDate(data.race.election_date)}</span><span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{data.candidates.length} verified candidates</span></div>
    </div></section>
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <section className="mb-12"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-muted-foreground">Source-backed research</p><h2 className="mt-2 text-2xl font-semibold">Compare positions by issue</h2></div><span className="text-sm text-muted-foreground">{data.claims.length} published positions</span></div>
        {data.claims.length > 0 ? <div className="mt-5 flex flex-wrap gap-2">{data.issues.filter((issue) => data.claims.some((claim) => claim.issue_id === issue.id)).map((issue) => <Button key={issue.id} asChild variant="outline"><Link to="/races/$raceId/issues/$issueId" params={{ raceId, issueId: issue.id }}>{issue.name}<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>)}</div> : <p className="mt-4 border-l-4 border-warning bg-warning/10 p-4 text-sm text-muted-foreground">Candidate filings are verified. No source-backed public positions have been published for this race yet.</p>}
      </section>
      <section><h2 className="text-2xl font-semibold">Who is running</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">These are separate party contests. Candidates are not running against the other party until a later general election.</p>
        <div className="mt-7 space-y-10">{groups.map((group) => <section key={group.key} className={`border-t-4 ${group.color}`}><div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-4 ${group.tone}`}><div><h3 className={`text-xl font-semibold ${group.text}`}>{group.title}</h3><p className="text-xs text-muted-foreground">{group.note}</p></div><span className="text-sm font-semibold">{group.candidates.length} filed</span></div>
          {group.candidates.length ? <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">{group.candidates.map((candidate) => {
            const claims = data.claims.filter((claim) => claim.candidate_id === candidate.id).sort((a, b) => (a.issues?.display_order ?? 99) - (b.issues?.display_order ?? 99));
            return <article key={candidate.id} className="flex min-h-72 flex-col border bg-card p-5 shadow-card"><div className="flex items-start justify-between gap-3"><div><h4 className="text-lg font-semibold">{candidate.name}</h4><PartyBadge party={candidate.party_or_affiliation} className="mt-2" /></div><CheckCircle2 className="h-5 w-5 text-success" aria-label="Verified filing" /></div>
              <div className="mt-5 flex-1">{claims.length ? <><p className="text-xs font-semibold uppercase text-muted-foreground">Documented positions</p>{claims.slice(0, 2).map((claim) => <div key={claim.id} className="mt-3 border-l-2 border-primary pl-3"><p className="text-xs font-semibold text-primary">{claim.issues?.name}</p><p className="mt-1 line-clamp-3 text-sm">{claim.summary}</p>{claim.sources?.url && <a href={claim.sources.url} target="_blank" rel="noreferrer noopener" className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">Original source <ExternalLink className="h-3 w-3" /></a>}</div>)}</> : <p className="text-sm text-muted-foreground">No verified public positions found yet. We do not infer a position from party affiliation.</p>}</div>
              <Button asChild variant="outline" className="mt-5 w-full"><Link to="/candidates/$candidateId" params={{ candidateId: candidate.id }}>Candidate details</Link></Button>
            </article>;
          })}</div> : <p className="border border-dashed p-6 text-sm text-muted-foreground">No verified candidates filed in this party contest.</p>}
        </section>)}</div>
      </section>
    </div>
  </main><SiteFooter /></div>;
}

function PageMessage({ text }: { text: string }) {
  return <div className="min-h-screen bg-background"><SiteHeader /><main className="container mx-auto max-w-6xl px-4 py-16"><p className="text-muted-foreground">{text}</p></main></div>;
}