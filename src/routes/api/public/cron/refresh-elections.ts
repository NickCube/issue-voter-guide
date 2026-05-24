import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  DEFAULT_HUB_URL,
  discoverRaceLinks,
  saveParsedRace,
  scrapeAndExtractRace,
} from "@/lib/ballotpedia-import.server";

// Called daily by pg_cron with the project's anon key in `apikey` header.
// /api/public/* bypasses Lovable's published-site auth, so anon key alone
// is the gate (and it's hostile to drive-by abuse: it scrapes and writes).
export const Route = createFileRoute("/api/public/cron/refresh-elections")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Require Supabase anon key in header to discourage drive-by hits.
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        let hubUrl = DEFAULT_HUB_URL;
        let maxRaces = 10;
        try {
          const body = (await request.json().catch(() => null)) as
            | { hubUrl?: string; maxRaces?: number }
            | null;
          if (body?.hubUrl && /^https?:\/\//.test(body.hubUrl))
            hubUrl = body.hubUrl;
          if (
            typeof body?.maxRaces === "number" &&
            body.maxRaces > 0 &&
            body.maxRaces <= 20
          )
            maxRaces = body.maxRaces;
        } catch {
          /* ignore */
        }

        const started = Date.now();
        const results: Array<Record<string, unknown>> = [];
        try {
          const links = await discoverRaceLinks(hubUrl);
          const targets = links.slice(0, maxRaces);
          for (const url of targets) {
            try {
              const parsed = await scrapeAndExtractRace(url);
              const saved = await saveParsedRace(supabaseAdmin, parsed);
              results.push({
                url,
                ok: true,
                raceName: parsed.race.name,
                reused: saved.reused,
                candidatesInserted: saved.candidatesInserted,
                issuesInserted: saved.issuesInserted,
              });
            } catch (e) {
              results.push({
                url,
                ok: false,
                error: e instanceof Error ? e.message : String(e),
              });
            }
          }
        } catch (e) {
          return Response.json(
            {
              ok: false,
              error: e instanceof Error ? e.message : String(e),
              elapsedMs: Date.now() - started,
            },
            { status: 500 },
          );
        }

        return Response.json({
          ok: true,
          hubUrl,
          processed: results.length,
          successes: results.filter((r) => r.ok).length,
          elapsedMs: Date.now() - started,
          results,
        });
      },
      GET: async () =>
        new Response("Method Not Allowed", {
          status: 405,
          headers: { Allow: "POST" },
        }),
    },
  },
});
