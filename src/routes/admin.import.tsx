import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  autoDiscoverAndImport,
  importFromBallotpedia,
  saveBallotpediaImport,
} from "@/lib/ballotpedia-import.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Globe,
  Loader2,
  Download,
  CheckCircle2,
  Zap,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/admin/import")({
  component: ImportPage,
});

type Preview = {
  url: string;
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

type DiscoverResult = {
  url: string;
  ok: boolean;
  raceName?: string;
  reused?: boolean;
  candidates?: number;
  issues?: number;
  error?: string;
};

const DEFAULT_HUB =
  "https://ballotpedia.org/Morris_County,_New_Jersey_elections,_2025";

function ImportPage() {
  const importFn = useServerFn(importFromBallotpedia);
  const saveFn = useServerFn(saveBallotpediaImport);
  const autoFn = useServerFn(autoDiscoverAndImport);

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  const [hubUrl, setHubUrl] = useState(DEFAULT_HUB);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoResults, setAutoResults] = useState<DiscoverResult[] | null>(null);

  async function handleAuto() {
    setAutoLoading(true);
    setAutoResults(null);
    try {
      const res = await autoFn({ data: { hubUrl, maxRaces: 10 } });
      setAutoResults(res.results);
      const ok = res.results.filter((r) => r.ok).length;
      toast.success(
        `Imported ${ok}/${res.results.length} races from ${res.totalLinks} discovered links.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auto-import failed");
    } finally {
      setAutoLoading(false);
    }
  }

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
        Auto-discover all races from a Ballotpedia hub page (e.g. county-wide
        elections overview), or import a single race manually. The same job
        runs daily from a cron schedule.
      </p>

      {/* ─── Auto discover ─────────────────────────────────────── */}
      <div className="mt-6 grid gap-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-xl font-semibold">
            Auto-discover &amp; import
          </h2>
        </div>
        <div>
          <Label>Hub URL (county / state elections overview)</Label>
          <Input
            value={hubUrl}
            onChange={(e) => setHubUrl(e.target.value)}
            placeholder={DEFAULT_HUB}
            className="mt-1 font-mono text-xs"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Default points at Morris County NJ 2025. Change to any
            ballotpedia.org overview page.
          </p>
        </div>
        <div>
          <Button onClick={handleAuto} disabled={autoLoading}>
            {autoLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Discovering
                &amp; importing…
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" /> Run now
              </>
            )}
          </Button>
        </div>

        {autoResults && (
          <ul className="mt-2 grid gap-2">
            {autoResults.map((r, i) => (
              <li
                key={i}
                className="rounded-md border bg-muted/30 p-3 text-sm"
              >
                <div className="flex items-start gap-2">
                  {r.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {r.raceName ?? r.url.replace("https://ballotpedia.org/", "")}
                    </div>
                    {r.ok ? (
                      <div className="text-xs text-muted-foreground">
                        {r.reused ? "Updated existing race" : "Created new race"}
                        {" • "}
                        +{r.candidates ?? 0} candidates, +{r.issues ?? 0} issues
                      </div>
                    ) : (
                      <div className="text-xs text-destructive">{r.error}</div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ─── Single URL import ─────────────────────────────────── */}
      <div className="mt-6 grid gap-4 rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="font-serif text-xl font-semibold">
          Import a single race URL
        </h2>
        <div>
          <Label>Ballotpedia race URL</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://ballotpedia.org/..."
            className="mt-1"
          />
        </div>
        <div>
          <Button onClick={handleImport} disabled={loading} variant="outline">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Fetch &amp; preview
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
                  {c.bio && (
                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                      {c.bio}
                    </p>
                  )}
                </li>
              ))}
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
