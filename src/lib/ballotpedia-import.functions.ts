import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_HUB_URL,
  discoverRaceLinks,
  saveParsedRace,
  scrapeAndExtractRace,
  type ParsedRace,
} from "./ballotpedia-import.server";

async function requireAdmin(context: {
  supabase: { from: (t: string) => unknown };
  userId: string;
}) {
  const sb = context.supabase as any;
  const { data: roleRow } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) throw new Error("Forbidden: admin role required");
}

// ─── Single-URL import (preview then save) ─────────────────────────────────

export const importFromBallotpedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ url: z.string().url() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const parsed = await scrapeAndExtractRace(data.url);
    return { preview: { url: data.url, ...parsed } };
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
    .max(40),
  issues: z
    .array(
      z.object({
        name: z.string().min(2).max(200),
        description: z.string().max(1000).optional().nullable(),
      }),
    )
    .max(20),
});

export const saveBallotpediaImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PreviewSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const result = await saveParsedRace(context.supabase as any, {
      race: data.race,
      candidates: data.candidates,
      issues: data.issues,
    } as ParsedRace);
    return result;
  });

// ─── Auto-discover + import all races from a hub page ─────────────────────

export const autoDiscoverAndImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        hubUrl: z.string().url().optional(),
        maxRaces: z.number().int().min(1).max(20).default(10),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const hubUrl = data.hubUrl ?? DEFAULT_HUB_URL;
    const links = await discoverRaceLinks(hubUrl);
    const targets = links.slice(0, data.maxRaces);

    const sb = context.supabase as any;
    const results: Array<{
      url: string;
      ok: boolean;
      raceName?: string;
      reused?: boolean;
      candidates?: number;
      issues?: number;
      error?: string;
    }> = [];

    for (const url of targets) {
      try {
        const parsed = await scrapeAndExtractRace(url);
        const saved = await saveParsedRace(sb, parsed);
        results.push({
          url,
          ok: true,
          raceName: parsed.race.name,
          reused: saved.reused,
          candidates: saved.candidatesInserted,
          issues: saved.issuesInserted,
        });
      } catch (e) {
        results.push({
          url,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return { hubUrl, totalLinks: links.length, results };
  });
