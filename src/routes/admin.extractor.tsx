import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractPosition } from "@/lib/extractor.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/extractor")({
  component: ExtractorPage,
});

type Result = Awaited<ReturnType<typeof extractPosition>>["result"];

function ExtractorPage() {
  const extract = useServerFn(extractPosition);
  const [candidateId, setCandidateId] = useState("");
  const [issueId, setIssueId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [editSummary, setEditSummary] = useState("");
  const [editQuote, setEditQuote] = useState("");

  const { data: candidates } = useQuery({
    queryKey: ["candidates-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidates")
        .select("id,name,race_id,races(name)")
        .order("name");
      return data ?? [];
    },
  });
  const { data: issues } = useQuery({
    queryKey: ["issues-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("issues")
        .select("id,name,race_id")
        .order("name");
      return data ?? [];
    },
  });

  const candidate = useMemo(
    () => candidates?.find((c) => c.id === candidateId),
    [candidates, candidateId],
  );
  const issue = useMemo(
    () => issues?.find((i) => i.id === issueId),
    [issues, issueId],
  );
  const filteredIssues = useMemo(
    () =>
      candidate
        ? (issues ?? []).filter((i) => i.race_id === candidate.race_id)
        : (issues ?? []),
    [issues, candidate],
  );

  async function handleExtract() {
    if (!candidate || !issue) {
      toast.error("Pick a candidate and issue");
      return;
    }
    if (!sourceUrl && !pastedText.trim()) {
      toast.error("Paste source text or enter a URL");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await extract({
        data: {
          candidateName: candidate.name,
          issueName: issue.name,
          sourceUrl: sourceUrl || undefined,
          pastedText: pastedText || undefined,
        },
      });
      setResult(res.result);
      setEditSummary(res.result.summary);
      setEditQuote(res.result.evidence_quote);
      if (!res.result.found) {
        toast.message("No clear position found in source.");
      } else {
        toast.success(`Extracted (${res.result.confidence} confidence)`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDraft() {
    if (!result || !candidate || !issue) return;
    setSaving(true);
    try {
      // 1. create source
      const { data: src, error: srcErr } = await supabase
        .from("sources")
        .insert({
          candidate_id: candidate.id,
          title: result.source_title || "Imported source",
          url: sourceUrl || null,
          excerpt: result.source_excerpt || pastedText.slice(0, 400) || null,
          raw_text: pastedText || null,
          source_type: sourceUrl ? "Web" : "Pasted",
        })
        .select("id")
        .single();
      if (srcErr) throw srcErr;

      // 2. create draft position claim
      const { error: claimErr } = await supabase.from("position_claims").insert({
        candidate_id: candidate.id,
        issue_id: issue.id,
        source_id: src.id,
        summary: editSummary,
        evidence_quote: editQuote,
        confidence: result.confidence,
        status: "Draft",
        last_reviewed_at: new Date().toISOString(),
      });
      if (claimErr) throw claimErr;

      toast.success("Saved as Draft — review in Position Claims");
      setResult(null);
      setPastedText("");
      setSourceUrl("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          AI Source Extractor
        </h1>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Paste an article, statement, or candidate webpage. The AI returns a draft
        position summary, evidence quote, and confidence — for your review. Nothing
        is published until you approve it in Position Claims.
      </p>

      <div className="mt-8 grid gap-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Candidate</Label>
            <select
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={candidateId}
              onChange={(e) => {
                setCandidateId(e.target.value);
                setIssueId("");
              }}
            >
              <option value="">Select candidate…</option>
              {candidates?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.races?.name ? `— ${c.races.name}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Issue</Label>
            <select
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={issueId}
              onChange={(e) => setIssueId(e.target.value)}
              disabled={!candidate}
            >
              <option value="">
                {candidate ? "Select issue…" : "Pick candidate first"}
              </option>
              {filteredIssues.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label>Source URL (optional)</Label>
          <Input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://candidate-site.com/housing-plan"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Or paste source text</Label>
          <Textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste the article, speech transcript, or platform statement here…"
            rows={8}
            className="mt-1 font-mono text-xs"
          />
        </div>

        <div>
          <Button onClick={handleExtract} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extracting…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Extract position
              </>
            )}
          </Button>
        </div>
      </div>

      {result && (
        <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold">Draft (review before saving)</h2>
            <ConfidenceBadge confidence={result.confidence} />
          </div>

          {!result.found && (
            <p className="mt-4 rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
              The AI did not find a clear position on this issue in the provided source.
              You can still save a draft, but consider providing better source material.
            </p>
          )}

          <div className="mt-4 grid gap-4">
            <div>
              <Label>Summary</Label>
              <Textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Evidence quote</Label>
              <Textarea
                value={editQuote}
                onChange={(e) => setEditQuote(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <div>
                <strong>Source title:</strong> {result.source_title}
              </div>
              {sourceUrl && (
                <div className="truncate">
                  <strong>URL:</strong> {sourceUrl}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveDraft} disabled={saving}>
                {saving ? "Saving…" : "Save as Draft claim"}
              </Button>
              <Button variant="ghost" onClick={() => setResult(null)}>
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
