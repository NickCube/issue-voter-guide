import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  candidateName: z.string().min(1).max(200),
  issueName: z.string().min(1).max(200),
  sourceUrl: z.string().url().optional().or(z.literal("")).optional(),
  pastedText: z.string().max(50000).optional(),
});

const SYSTEM_PROMPT = `You are a strictly nonpartisan research assistant for BallotBrief.
Your only job: read source material from or about a candidate and extract what they
have publicly stated about a specific policy issue.

RULES — follow exactly:
1. Use ONLY the provided source text. Do not use outside knowledge.
2. Write a plain-English, neutral, 1–3 sentence summary of the candidate's position.
3. Quote the strongest single supporting sentence verbatim as "evidence_quote".
4. Set "confidence":
   - "High" = candidate makes an explicit, unambiguous policy statement on this issue
   - "Medium" = position is implied or partial
   - "Low" = only tangentially mentioned
5. If the source does NOT contain a clear position on this issue, return found=false
   and leave the other fields empty. Do not guess. Do not infer party-line positions.
6. Never editorialize. Never recommend. Never rank.`;

type ExtractResult = {
  found: boolean;
  summary: string;
  evidence_quote: string;
  confidence: "High" | "Medium" | "Low";
  source_title: string;
  source_excerpt: string;
};

async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "BallotBriefBot/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Could not fetch URL (${res.status})`);
  const html = await res.text();
  // strip scripts/styles + tags
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 30000);
}

export const extractPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    // admin check
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden: admin role required");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    let sourceText = (data.pastedText ?? "").trim();
    let derivedTitle = "Pasted source";
    if (!sourceText && data.sourceUrl) {
      sourceText = await fetchUrlText(data.sourceUrl);
      try {
        derivedTitle = new URL(data.sourceUrl).hostname;
      } catch {
        // keep default
      }
    }
    if (!sourceText) throw new Error("Provide a source URL or pasted text.");

    const userPrompt = `Candidate: ${data.candidateName}
Issue: ${data.issueName}

SOURCE TEXT:
"""
${sourceText.slice(0, 28000)}
"""

Extract this candidate's position on "${data.issueName}" from the source text above.`;

    const resp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "record_position",
                description:
                  "Record the extracted candidate position on the given issue.",
                parameters: {
                  type: "object",
                  properties: {
                    found: {
                      type: "boolean",
                      description: "True only if the source contains a clear position.",
                    },
                    summary: { type: "string" },
                    evidence_quote: { type: "string" },
                    confidence: {
                      type: "string",
                      enum: ["High", "Medium", "Low"],
                    },
                    source_title: { type: "string" },
                    source_excerpt: {
                      type: "string",
                      description: "Short excerpt (max 400 chars) for the source record.",
                    },
                  },
                  required: [
                    "found",
                    "summary",
                    "evidence_quote",
                    "confidence",
                    "source_title",
                    "source_excerpt",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "record_position" },
          },
        }),
      },
    );

    if (resp.status === 429) {
      throw new Error("AI rate limit hit. Wait a moment and try again.");
    }
    if (resp.status === 402) {
      throw new Error(
        "AI credits exhausted. Top up at Settings → Workspace → Usage.",
      );
    }
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`AI gateway error ${resp.status}: ${t.slice(0, 200)}`);
    }

    const json = await resp.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return a structured result.");
    }
    const parsed = JSON.parse(toolCall.function.arguments) as ExtractResult;
    if (!parsed.source_title || parsed.source_title.length < 2) {
      parsed.source_title = derivedTitle;
    }
    return {
      result: parsed,
      sourceUrl: data.sourceUrl || null,
    };
  });
