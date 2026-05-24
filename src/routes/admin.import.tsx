import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  importFromBallotpedia,
  saveBallotpediaImport,
} from "@/lib/ballotpedia-import.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Loader2, Download, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/admin/import")({
  component: ImportPage,
});

type Preview = Awaited<ReturnType<typeof importFromBallotpedia>>["preview"];

function ImportPage() {
  const importFn = useServerFn(importFromBallotpedia);
  const saveFn = useServerFn(saveBallotpediaImport);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  async function handleImport() {
    if (!/^https?:\/\/(www\.)?ballotpedia\.org\//i.test(url)) {
      toast.error("Enter a ballotpedia.org URL");
      return;
    }
    setLoading(true);
    setPreview(null);
    try {
      const res = await importFn({ data: { url } });
      setPreview(res.preview);
      toast.success(
        `Found ${res.preview.candidates.length} candidates, ${res.preview.issues.length} issues`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    try {
      const res = await saveFn({ data: preview });
      toast.success(
        `Saved! ${res.candidatesInserted} candidates + ${res.issuesInserted} issues added.`,
      );
      setPreview(null);
      setUrl("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-primary" />
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Import from Ballotpedia
        </h1>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Paste a Ballotpedia race page URL. We scrape it with Firecrawl, then use
        AI to extract real race details, candidates, and issues. You review
        before anything is saved.
      </p>
      <p className="mt-2 max-w-2xl text-xs text-muted-foreground">
        Example:{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">
          https://ballotpedia.org/Morris_County,_New_Jersey_elections,_2025
        </code>
      </p>

      <div className="mt-6 grid gap-4 rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <Label>Ballotpedia URL</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://ballotpedia.org/..."
            className="mt-1"
          />
        </div>
        <div>
          <Button onClick={handleImport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scraping &
                extracting…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Fetch & preview
              </>
            )}
          </Button>
        </div>
      </div>

      {preview && (
        <div className="mt-6 grid gap-4 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-serif text-xl font-semibold">Preview</h2>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Race
            </h3>
            <div className="mt-2 rounded-md border bg-muted/30 p-4 text-sm">
              <div className="font-medium">{preview.race.name}</div>
              <div className="mt-1 text-muted-foreground">
                {preview.race.location ?? "—"}
                {preview.race.election_date
                  ? ` • ${preview.race.election_date}`
                  : ""}
              </div>
              {preview.race.office_description && (
                <p className="mt-2 text-muted-foreground">
                  {preview.race.office_description}
                </p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Candidates ({preview.candidates.length})
            </h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {preview.candidates.map((c, i) => (
                <li
                  key={i}
                  className="rounded-md border bg-muted/30 p-3 text-sm"
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.party_or_affiliation ?? "Unknown party"}
                  </div>
                  {c.website_url && (
                    <a
                      href={c.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block truncate text-xs text-primary hover:underline"
                    >
                      {c.website_url}
                    </a>
                  )}
                  {c.bio && (
                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                      {c.bio}
                    </p>
                  )}
                </li>
              ))}
              {!preview.candidates.length && (
                <li className="text-sm text-muted-foreground">
                  No candidates found.
                </li>
              )}
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Issues ({preview.issues.length})
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {preview.issues.map((i, idx) => (
                <span
                  key={idx}
                  className="rounded-full border bg-muted/40 px-3 py-1 text-xs"
                  title={i.description ?? undefined}
                >
                  {i.name}
                </span>
              ))}
            </div>
          </section>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Save to database
                </>
              )}
            </Button>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
