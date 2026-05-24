import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  url: z.string().url(),
});

const PreviewSchema = z.object({
  url: z.string().url(),
  raceId: z.string().uuid().optional(),
  race: z.object({
    name: z.string().min(2).max(300),
    location: z.string().max(300).optional().nullable(),
    election_date: z.string().max(40).optional().nullable(),
    office_description: z.string().max(2000).optional().nullable(),
  }),
  candidates: z
    .array(
      z.object({
        name: z.string().min(2).max(200),
        party_or_affiliation: z.string().max(120).optional().nullable(),
        website_url: z.string().max(500).optional().nullable(),
        bio: z.string().max(2000).optional().nullable(),
      }),
    )
    .min(0)
    .max(40),
  issues: z
    .array(
      z.object({
        name: z.string().min(2).max(200),
        description: z.string().max(1000).optional().nullable(),
      }),
    )
    .min(0)
    .max(20),
});

const SYSTEM_PROMPT = `You are a strictly nonpartisan data extractor for BallotBrief.
Read a Ballotpedia race page (in markdown) and extract structured data.

Rules:
1. Use ONLY the source text. No outside knowledge.
2. "race.name" = the full race title (e.g. "Morris County Commissioner — 2025 General Election").
3. "race.location" = State, County, or City as written.
4. "race.election_date" = ISO format YYYY-MM-DD if present, else null.
5. "race.office_description" = 1-3 sentence neutral description of the office.
6. "candidates" = ONLY people actively running in the CURRENT election cycle shown on the page.
   - Skip historical candidates, incumbents not running again, withdrawn candidates.
   - "party_or_affiliation" = e.g. "Democratic", "Republican", "Independent".
   - "website_url" = candidate's official campaign site if listed.
   - "bio" = 1-3 neutral sentences from the page.
7. "issues" = 4-8 of the most important policy issues for this race based on the page content
   (e.g. "Housing", "Public Safety", "Taxes"). If the page lists "key issues" use those;
   otherwise infer reasonable categories from the office's responsibilities.
8. Never editorialize. Never guess. If a field is unknown, omit or null it.`;

export const importFromBallotpedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    // admin gate
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden: admin role required");

    if (!/ballotpedia\.org/i.test(data.url)) {
      throw new Error("URL must be a ballotpedia.org page.");
    }

    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlKey) throw new Error("FIRECRAWL_API_KEY not configured");
    const aiKey = process.env.LOVABLE_API_KEY;
    if (!aiKey) throw new Error("LOVABLE_API_KEY not configured");

    // 1) Scrape Ballotpedia page via Firecrawl
    const scrapeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: data.url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });
    if (!scrapeRes.ok) {
      const t = await scrapeRes.text();
      throw new Error(
        `Firecrawl error ${scrapeRes.status}: ${t.slice(0, 200)}`,
      );
    }
    const scrapeJson = await scrapeRes.json();
    const markdown: string =
      scrapeJson?.data?.markdown ?? scrapeJson?.markdown ?? "";
    if (!markdown || markdown.length < 200) {
      throw new Error("Firecrawl returned little or no content for this page.");
    }

    // 2) Send to AI Gateway with tool-call schema
    const aiRes = await fetch(
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
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Ballotpedia URL: ${data.url}\n\nPAGE MARKDOWN:\n"""\n${markdown.slice(0, 60000)}\n"""\n\nExtract the race, candidates, and issues.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "record_race",
                description: "Record structured race + candidates + issues.",
                parameters: {
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
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "record_race" },
          },
        }),
      },
    );

    if (aiRes.status === 429)
      throw new Error("AI rate limit hit. Try again in a moment.");
    if (aiRes.status === 402)
      throw new Error(
        "AI credits exhausted. Top up at Settings → Workspace → Usage.",
      );
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway error ${aiRes.status}: ${t.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured output.");
    }
    const parsed = JSON.parse(toolCall.function.arguments);
    return {
      preview: {
        url: data.url,
        race: parsed.race ?? {},
        candidates: parsed.candidates ?? [],
        issues: parsed.issues ?? [],
      },
    };
  });

export const saveBallotpediaImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PreviewSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden: admin role required");

    const sb = context.supabase;

    // 1) race (insert or reuse)
    let raceId = data.raceId;
    if (!raceId) {
      const { data: race, error: raceErr } = await sb
        .from("races")
        .insert({
          name: data.race.name,
          location: data.race.location ?? null,
          election_date: data.race.election_date || null,
          office_description: data.race.office_description ?? null,
          status: "active",
        })
        .select("id")
        .single();
      if (raceErr) throw new Error(`Race insert failed: ${raceErr.message}`);
      raceId = race.id;
    }

    // 2) candidates (skip duplicates by name within race)
    const { data: existingCands } = await sb
      .from("candidates")
      .select("name")
      .eq("race_id", raceId);
    const have = new Set(
      (existingCands ?? []).map((c) => c.name.toLowerCase().trim()),
    );
    const newCands = data.candidates.filter(
      (c) => !have.has(c.name.toLowerCase().trim()),
    );
    let candidatesInserted = 0;
    if (newCands.length) {
      const { error: cErr } = await sb.from("candidates").insert(
        newCands.map((c) => ({
          race_id: raceId!,
          name: c.name,
          party_or_affiliation: c.party_or_affiliation ?? null,
          website_url: c.website_url ?? null,
          bio: c.bio ?? null,
        })),
      );
      if (cErr) throw new Error(`Candidate insert failed: ${cErr.message}`);
      candidatesInserted = newCands.length;
    }

    // 3) issues (skip dupes by name)
    const { data: existingIssues } = await sb
      .from("issues")
      .select("name")
      .eq("race_id", raceId);
    const haveIssues = new Set(
      (existingIssues ?? []).map((i) => i.name.toLowerCase().trim()),
    );
    const newIssues = data.issues.filter(
      (i) => !haveIssues.has(i.name.toLowerCase().trim()),
    );
    let issuesInserted = 0;
    if (newIssues.length) {
      const startOrder = existingIssues?.length ?? 0;
      const { error: iErr } = await sb.from("issues").insert(
        newIssues.map((i, idx) => ({
          race_id: raceId!,
          name: i.name,
          description: i.description ?? null,
          display_order: startOrder + idx,
        })),
      );
      if (iErr) throw new Error(`Issue insert failed: ${iErr.message}`);
      issuesInserted = newIssues.length;
    }

    return {
      raceId,
      candidatesInserted,
      issuesInserted,
    };
  });
