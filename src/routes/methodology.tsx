import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — BallotBrief" },
      {
        name: "description",
        content:
          "How BallotBrief researches, sources, and reviews candidate positions — and when we say 'No clear public position found.'",
      },
      { property: "og:title", content: "Methodology — BallotBrief" },
      { property: "og:description", content: "How BallotBrief verifies election filings and publishes source-backed candidate positions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Methodology,
});

function Methodology() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          Methodology
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          How we research, summarize, and publish candidate positions.
        </p>

        <div className="prose prose-slate mt-10 max-w-none space-y-6 text-foreground">
          <Section title="We are nonpartisan">
            BallotBrief does not endorse, rank, or recommend candidates. Our goal is to help
            voters understand what each candidate has publicly said and done.
          </Section>

          <Section title="What we summarize">
            We summarize public candidate positions on issues that matter in a given race —
            for example, Housing, Taxes, Public Safety, Schools, Transit, and Climate.
            Summaries are written in plain English.
          </Section>

          <Section title="Official records come first">
            The public race and candidate roster comes from the Somerset County Clerk.
            Records imported from other sources stay hidden until they are verified.
          </Section>

          <Section title="Sources we use for positions">
            <ul className="list-disc pl-6">
              <li>Candidate websites</li>
              <li>Interviews</li>
              <li>Debate transcripts and recordings</li>
              <li>Candidate questionnaires</li>
              <li>Voting records</li>
              <li>Reputable news reporting</li>
            </ul>
          </Section>

          <Section title="Every claim has a receipt">
            Each published position is tied to a specific source. We display the source title,
            type, publication date, and a link so you can verify the evidence yourself.
          </Section>

          <Section title="How AI is used">
            AI may help locate and summarize source material. It cannot make a race,
            candidate, or position public by itself. Published positions require a source
            link and review; missing evidence is shown as a gap, never filled by guessing.
          </Section>

          <Section title="When evidence is missing">
            If we cannot find a clear public position from a candidate on an issue, we say so:
            <em> “No clear public position found.”</em> We do not infer, guess, or imply a
            position when no source exists.
          </Section>

          <Section title="Human review">
            All claims are reviewed by a human before they are published. Draft claims and
            rejected claims never appear on public pages.
          </Section>

          <Section title="What we will never do">
            We will never tell you who to vote for. We do not use language like “best
            candidate,” “winner,” or “recommended.” Our job is to help you compare — yours is
            to decide.
          </Section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mt-8 font-serif text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 text-muted-foreground">{children}</div>
    </section>
  );
}
