import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, ArrowUpRight, CalendarDays, X, Hash, Home, Loader2, ChevronRight } from "lucide-react";
import {
  matchAddressToTowns,
  matchingElectionRaces,
  SOMERSET_ZIP_TO_TOWN,
  SOMERSET_TOWNS,
} from "@/lib/address-match";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "bb.address";

const SUGGESTION_TOWNS = [...SOMERSET_TOWNS];

type Suggestion = {
  label: string;
  sub: string;
  value: string;
  kind: "town" | "zip" | "address";
};

function buildLocalSuggestions(query: string): Suggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tail = q.split(/[,\n]/).pop()?.trim() ?? q;
  const needle = tail.length >= 2 ? tail : q;
  if (needle.length < 2) return [];

  const results: Suggestion[] = [];

  if (/^\d{2,5}$/.test(needle)) {
    for (const [zip, town] of Object.entries(SOMERSET_ZIP_TO_TOWN)) {
      if (zip.startsWith(needle)) {
        results.push({ label: zip, sub: `${town}, Somerset County`, value: zip, kind: "zip" });
        if (results.length >= 5) break;
      }
    }
  }

  for (const town of SUGGESTION_TOWNS) {
    if (town.toLowerCase().includes(needle)) {
      results.push({ label: town, sub: "Somerset County, NJ", value: `${town}, NJ`, kind: "town" });
      if (results.length >= 6) break;
    }
  }

  const seen = new Set<string>();
  return results.filter((r) => (seen.has(r.value) ? false : (seen.add(r.value), true)));
}

async function fetchStreetSuggestions(query: string, signal: AbortSignal): Promise<Suggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const looksLikeStreet =
    /^\d+\s+\S+/.test(q) ||
    /\b(st|street|rd|road|ln|lane|ave|avenue|dr|drive|blvd|ct|court|way|pl|place|ter|terrace|hwy|pkwy)\b\.?/i.test(q);
  const mentionsNJ = /\bnj\b|new jersey/i.test(q);
  const hinted = looksLikeStreet && !mentionsNJ ? `${q}, Somerset County, NJ` : q;

  const results: Suggestion[] = [];

  try {
    const url =
      `https://photon.komoot.io/api/?q=${encodeURIComponent(hinted)}` +
      `&lat=40.5633&lon=-74.6168&zoom=11&limit=8&lang=en`;
    const res = await fetch(url, { signal });
    if (res.ok) {
      const json = (await res.json()) as {
        features?: Array<{
          properties?: {
            name?: string; housenumber?: string; street?: string;
            city?: string; state?: string; postcode?: string;
            country?: string; countrycode?: string;
          };
        }>;
      };
      for (const f of json.features ?? []) {
        const p = f.properties ?? {};
        if (p.countrycode && p.countrycode !== "US") continue;
        if (p.state && p.state !== "New Jersey") continue;
        const street = [p.housenumber, p.street].filter(Boolean).join(" ");
        const primary = street || p.name || p.city || "";
        if (!primary) continue;
        const sub = [p.city, p.state, p.postcode].filter(Boolean).join(", ");
        const value = [primary, p.city, p.state, p.postcode].filter(Boolean).join(", ");
        results.push({ label: primary, sub, value, kind: "address" });
      }
    }
  } catch {}

  const seen = new Set<string>();
  return results.filter((r) => (seen.has(r.value.toLowerCase()) ? false : (seen.add(r.value.toLowerCase()), true)));
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AddressFinder() {
  const [election, setElection] = useState<"general" | "primary">("general");
  const [input, setInput] = useState("");
  const [address, setAddress] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setAddress(saved);
        setInput(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data: races = [], isLoading, isError } = useQuery({
    queryKey: ["address-finder-races", "election-aware"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("races")
        .select("id, name, location, election_date, office_description, is_verified, election_type")
        .eq("is_verified", true)
        .order("election_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const localSuggestions = useMemo(() => buildLocalSuggestions(input), [input]);
  const [remoteSuggestions, setRemoteSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = input.trim();
    setRemoteSuggestions([]);
    if (q.length < 3 || !/\d+\s+\S+/.test(q)) {
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const t = setTimeout(async () => {
      const results = await fetchStreetSuggestions(q, controller.signal);
      if (controller.signal.aborted) return;
      setRemoteSuggestions(results);
      setSearching(false);
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [input]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const merged = [...localSuggestions, ...remoteSuggestions];
    const seen = new Set<string>();
    return merged
      .filter((s) => (seen.has(s.value.toLowerCase()) ? false : (seen.add(s.value.toLowerCase()), true)))
      .slice(0, 8);
  }, [localSuggestions, remoteSuggestions]);
  const match = useMemo(() => matchAddressToTowns(address), [address]);
  const filtered = useMemo(
    () => matchingElectionRaces(races, address, election),
    [address, races, election],
  );

  function commit(value: string) {
    const v = value.trim();
    setInput(v);
    setAddress(v);
    setOpen(false);
    try {
      if (v) localStorage.setItem(STORAGE_KEY, v);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (open && matchAddressToTowns(input).detectedFrom === "none" && suggestions[activeIdx]) {
      commit(suggestions[activeIdx].value);
    } else {
      commit(input);
    }
  }

  function clear() {
    setInput("");
    setAddress("");
    setOpen(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const resolved = address && match.detectedFrom !== "none";

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Election">
        <Button variant={election === "general" ? "default" : "outline"} aria-pressed={election === "general"} onClick={() => setElection("general")}>November 3 general</Button>
        <Button variant={election === "primary" ? "default" : "outline"} aria-pressed={election === "primary"} onClick={() => setElection("primary")}>June 2 archive</Button>
      </div>
      <div className="relative rounded-[2.5rem] border-4 border-primary/20 bg-card p-2 shadow-elegant sm:p-3">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1" ref={containerRef}>
            <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
            <Input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setAddress(e.target.value.trim());
                setOpen(true);
                setActiveIdx(0);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Enter your town, ZIP, or street address"
              className="h-14 border-none bg-transparent pl-12 pr-12 text-lg focus-visible:ring-0 placeholder:text-muted-foreground/60"
              aria-label="Your address, town, or ZIP"
              aria-expanded={open && suggestions.length > 0}
              aria-controls="address-suggestions"
              role="combobox"
              autoComplete="off"
            />
            {input && (
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={clear}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
                aria-label="Clear"
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            {open && (suggestions.length > 0 || searching) && (
              <ul
                role="listbox"
                id="address-suggestions"
                className="absolute left-0 right-0 top-full z-50 mt-4 max-h-[20rem] overflow-auto rounded-3xl border bg-popover p-2 shadow-elegant animate-in fade-in slide-in-from-top-2"
              >
                {suggestions.map((s, i) => (
                  <li key={`${s.kind}-${s.value}`}>
                    <Button
                      variant="ghost"
                      type="button"
                      role="option"
                      aria-selected={i === activeIdx}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => commit(s.value)}
                      className={cn(
                        "flex h-auto w-full items-center justify-start gap-3 rounded-2xl px-4 py-3 text-left transition-all",
                        i === activeIdx ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                          i === activeIdx ? "bg-white/20" : "bg-primary/5 text-primary",
                        )}
                      >
                        {s.kind === "zip" ? (
                          <Hash className="h-4 w-4" />
                        ) : s.kind === "address" ? (
                          <Home className="h-4 w-4" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold tracking-tight">{s.label}</span>
                        <span className={cn("block truncate text-xs", i === activeIdx ? "text-white/70" : "text-muted-foreground")}>
                          {s.sub}
                        </span>
                      </span>
                    </Button>
                  </li>
                ))}
                {searching && (
                  <li className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> Searching Somerset County...
                  </li>
                )}
              </ul>
            )}
          </div>
          <Button type="submit" size="lg" className="h-14 rounded-full px-8 text-lg font-bold shadow-md">
            <Search className="mr-2 h-5 w-5" />
            Find local elections
          </Button>
        </form>
      </div>

      {address && !resolved && <p role="status" className="mt-4 text-sm text-muted-foreground">Choose an address suggestion or include your Somerset County town. A street name alone cannot identify your ballot.</p>}
      {resolved && (
        <div aria-live="polite" className="mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
          {election === "general" && <section className="mb-6 border-l-4 border-primary pl-4">
            <h3 className="text-xl font-semibold">November ballot · {match.display}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Your ward and voting district determine the exact ballot. Check the county's official ballot and polling records.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild><a href="https://www.somersetcountynj.gov/government/elected-officials/county-clerk/election-division" target="_blank" rel="noopener noreferrer">Official local ballots <ArrowUpRight className="h-4 w-4" /></a></Button>
              <Button asChild variant="outline"><a href="https://www.somersetcountynj.gov/government/affiliated-agencies/election-board/polling-place-locator" target="_blank" rel="noopener noreferrer">Address-based polling lookup <MapPin className="h-4 w-4" /></a></Button>
            </div>
          </section>}
          <div className="mb-4 flex items-center justify-between px-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              {isLoading ? "Loading verified races…" : `${filtered.length} verified ${election === "general" ? "November" : "June primary"} ${filtered.length === 1 ? "race" : "races"} near ${match.display}`}
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((r) => (
              <Link
                key={r.id}
                to="/races/$raceId"
                params={{ raceId: r.id }}
                className="group flex items-center justify-between rounded-3xl border bg-card p-5 shadow-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
              >
                <div className="min-w-0">
                  <h4 className="truncate font-display text-lg font-bold">{r.name}</h4>
                  <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1 uppercase tracking-wider">
                      <MapPin className="h-3 w-3 text-primary" /> {r.location}
                    </span>
                    {r.election_date && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" /> {fmtDate(r.election_date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/10 bg-primary/5 text-primary transition-transform group-hover:bg-primary group-hover:text-primary-foreground">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </Link>
            ))}
            {!isLoading && filtered.length === 0 && (
              <div className="col-span-2 rounded-3xl border border-dashed p-10 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  {isError ? "Election listings could not load. The official county links remain available." : election === "general" ? "November candidates have not yet been verified here. This does not mean there are no elections for your town." : "No verified June primary listings matched this town."}
                </p>
                {election === "primary" && <Button asChild variant="link" className="mt-2 text-primary">
                  <Link to="/races">View all verified races</Link>
                </Button>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
