// Server-only helpers for scraping Ballotpedia + extracting structured race data.
// Used by admin server functions AND the public cron endpoint.

import type { SupabaseClient } from "@supabase/supabase-js";

export type ParsedRace = {
  race: {
    name: string;
    location?: string | null;
    election_date?: string | null;
    office_description?: string | null;
  };
  candidates: Array<{
    name: string;
    party_or_affiliation?: string | null;
    website_url?: string | null;
    bio?: string | null;
  }>;
  issues: Array<{ name: string; description?: string | null }>;
};

const EXTRACT_SYSTEM_PROMPT = `You are a strictly nonpartisan data extractor for BallotBrief.
Read a Ballotpedia race page (in markdown) and extract structured data.

Rules:
1. Use ONLY the source text. No outside knowledge.
2. "race.name" = the full race title.
3. "race.location" = State, County, or City as written.
4. "race.election_date" = ISO format YYYY-MM-DD if present, else null.
5. "race.office_description" = 1-3 sentence neutral description of the office.
6. "candidates" = ONLY people actively running in the CURRENT election cycle shown on the page.
   Skip historical, withdrawn, or non-running candidates.
7. "issues" = 4-8 important policy issues for this race based on the page content.
8. Never editorialize. Never guess. If a field is unknown, omit or null it.`;

const DISCOVER_SYSTEM_PROMPT = `You are a link extractor. Given a Ballotpedia hub
page (county or state elections overview) in markdown, return the list of
specific RACE pages linked from it — one URL per individual office/race
(e.g. "Morris County Commissioner election, 2025" or
"Mayor of Boonton election, 2025"). Skip generic links, candidate bios,
issue pages, news, and external links. Return absolute https URLs only.`;

async function firecrawlScrape(url: string): Promise<string> {
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) throw new Error("FIRECRAWL_API_KEY not configured");
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "links"],
      onlyMainContent: true,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Firecrawl error ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const md: string = json?.data?.markdown ?? json?.markdown ?? "";
  if (!md || md.length < 200) {
    throw new Error("Firecrawl returned little or no content");
  }
  return md;
}

async function aiTool<T>(
  systemPrompt: string,
  userPrompt: string,
  toolName: string,
  toolParams: Record<string, unknown>,
): Promise<T> {
  const aiKey = process.env.LOVABLE_API_KEY;
  if (!aiKey) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: toolName,
              parameters: toolParams,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: toolName } },
      }),
    },
  );
  if (res.status === 429) throw new Error("AI rate limit. Try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted.");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments)
    throw new Error("AI returned no structured output.");
  return JSON.parse(toolCall.function.arguments) as T;
}

export async function scrapeAndExtractRace(url: string): Promise<ParsedRace> {
  if (!/ballotpedia\.org/i.test(url))
    throw new Error("URL must be on ballotpedia.org");
  const md = await firecrawlScrape(url);
  const parsed = await aiTool<ParsedRace>(
    EXTRACT_SYSTEM_PROMPT,
    `Ballotpedia URL: ${url}\n\nPAGE MARKDOWN:\n"""\n${md.slice(0, 60000)}\n"""\n\nExtract the race, candidates, and issues.`,
    "record_race",
    {
      type: "object",
      properties: {
        race: {
          type: "object",
          properties: {
            name: { type: "string" },
            location: { type: "string" },
            election_date: { type: "string" },
            office_description: { type: "string" },
          },
          required: ["name"],
        },
        candidates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              party_or_affiliation: { type: "string" },
              website_url: { type: "string" },
              bio: { type: "string" },
            },
            required: ["name"],
          },
        },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
            },
            required: ["name"],
          },
        },
      },
      required: ["race", "candidates", "issues"],
    },
  );
  return {
    race: parsed.race ?? { name: "Unknown" },
    candidates: parsed.candidates ?? [],
    issues: parsed.issues ?? [],
  };
}

export async function discoverRaceLinks(hubUrl: string): Promise<string[]> {
  if (!/ballotpedia\.org/i.test(hubUrl))
    throw new Error("Hub URL must be on ballotpedia.org");
  const md = await firecrawlScrape(hubUrl);
  const parsed = await aiTool<{ race_urls: string[] }>(
    DISCOVER_SYSTEM_PROMPT,
    `Hub URL: ${hubUrl}\n\nPAGE MARKDOWN:\n"""\n${md.slice(0, 50000)}\n"""\n\nReturn the list of individual race-page URLs.`,
    "record_links",
    {
      type: "object",
      properties: {
        race_urls: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["race_urls"],
    },
  );
  // sanitize + dedupe
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parsed.race_urls ?? []) {
    if (typeof raw !== "string") continue;
    let u = raw.trim();
    if (u.startsWith("/")) u = `https://ballotpedia.org${u}`;
    if (!/^https?:\/\/(www\.)?ballotpedia\.org\//i.test(u)) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

// Insert/upsert a parsed race using whichever supabase client is provided.
export async function saveParsedRace(
  sb: SupabaseClient,
  parsed: ParsedRace,
): Promise<{
  raceId: string;
  candidatesInserted: number;
  issuesInserted: number;
  reused: boolean;
}> {
  // Look for an existing race with the same name (case-insensitive)
  const { data: existing } = await sb
    .from("races")
    .select("id")
    .ilike("name", parsed.race.name)
    .maybeSingle();

  let raceId: string;
  let reused = false;
  if (existing?.id) {
    raceId = existing.id;
    reused = true;
  } else {
    const { data: race, error: raceErr } = await sb
      .from("races")
      .insert({
        name: parsed.race.name,
        location: parsed.race.location ?? null,
        election_date: parsed.race.election_date || null,
        office_description: parsed.race.office_description ?? null,
        status: "active",
      })
      .select("id")
      .single();
    if (raceErr) throw new Error(`Race insert failed: ${raceErr.message}`);
    raceId = race.id;
  }

  // candidates
  const { data: existingCands } = await sb
    .from("candidates")
    .select("name")
    .eq("race_id", raceId);
  const have = new Set(
    (existingCands ?? []).map((c) => (c.name ?? "").toLowerCase().trim()),
  );
  const newCands = parsed.candidates.filter(
    (c) => c.name && !have.has(c.name.toLowerCase().trim()),
  );
  let candidatesInserted = 0;
  if (newCands.length) {
    const { error: cErr } = await sb.from("candidates").insert(
      newCands.map((c) => ({
        race_id: raceId,
        name: c.name,
        party_or_affiliation: c.party_or_affiliation ?? null,
        website_url: c.website_url ?? null,
        bio: c.bio ?? null,
      })),
    );
    if (cErr) throw new Error(`Candidate insert failed: ${cErr.message}`);
    candidatesInserted = newCands.length;
  }

  // issues
  const { data: existingIssues } = await sb
    .from("issues")
    .select("name")
    .eq("race_id", raceId);
  const haveIssues = new Set(
    (existingIssues ?? []).map((i) => (i.name ?? "").toLowerCase().trim()),
  );
  const newIssues = parsed.issues.filter(
    (i) => i.name && !haveIssues.has(i.name.toLowerCase().trim()),
  );
  let issuesInserted = 0;
  if (newIssues.length) {
    const startOrder = existingIssues?.length ?? 0;
    const { error: iErr } = await sb.from("issues").insert(
      newIssues.map((i, idx) => ({
        race_id: raceId,
        name: i.name,
        description: i.description ?? null,
        display_order: startOrder + idx,
      })),
    );
    if (iErr) throw new Error(`Issue insert failed: ${iErr.message}`);
    issuesInserted = newIssues.length;
  }

  return { raceId, candidatesInserted, issuesInserted, reused };
}

export const DEFAULT_HUB_URL =
  "https://ballotpedia.org/Morris_County,_New_Jersey_elections,_2025";
