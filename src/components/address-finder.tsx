import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, ArrowUpRight, CalendarDays, X, Hash, Home, Loader2 } from "lucide-react";
import {
  matchAddressToTowns,
  raceMatchesAddress,
  MORRIS_ZIP_TO_TOWN,
} from "@/lib/address-match";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "bb.address";

// Canonical municipality list for autocomplete (matches what races.location uses).
const SUGGESTION_TOWNS = [
  "Boonton Town", "Boonton Township", "Butler Borough", "Chatham Borough",
  "Chatham Township", "Chester Borough", "Chester Township", "Denville Township",
  "Dover", "East Hanover Township", "Florham Park Borough", "Hanover Township",
  "Harding Township", "Jefferson Township", "Kinnelon Borough", "Lincoln Park Borough",
  "Long Hill Township", "Madison", "Mendham Borough", "Mendham Township",
  "Mine Hill Township", "Montville Township", "Morris Plains Borough",
  "Morris Township", "Morristown", "Mount Arlington Borough", "Mount Olive",
  "Mountain Lakes", "Netcong", "Parsippany-Troy Hills", "Pequannock", "Randolph",
  "Riverdale", "Rockaway", "Rockaway Township", "Roxbury", "Victory Gardens",
  "Washington Township", "Wharton",
];

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
    for (const [zip, town] of Object.entries(MORRIS_ZIP_TO_TOWN)) {
      if (zip.startsWith(needle)) {
        results.push({ label: zip, sub: `${town}, NJ`, value: zip, kind: "zip" });
        if (results.length >= 5) break;
      }
    }
  }

  for (const town of SUGGESTION_TOWNS) {
    if (town.toLowerCase().includes(needle)) {
      results.push({ label: town, sub: "Morris County, NJ", value: `${town}, NJ`, kind: "town" });
      if (results.length >= 6) break;
    }
  }

  const seen = new Set<string>();
  return results.filter((r) => (seen.has(r.value) ? false : (seen.add(r.value), true)));
}

// Photon (OSM) — free, no API key. Biased toward Morris County, NJ.
async function fetchStreetSuggestions(query: string, signal: AbortSignal): Promise<Suggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
    `&lat=40.7968&lon=-74.4815&zoom=12&limit=6&lang=en`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      features?: Array<{
        properties?: {
          name?: string; housenumber?: string; street?: string;
          city?: string; state?: string; postcode?: string;
          country?: string; countrycode?: string;
        };
      }>;
    };
    const out: Suggestion[] = [];
    for (const f of json.features ?? []) {
      const p = f.properties ?? {};
      if (p.countrycode && p.countrycode !== "US") continue;
      if (p.state && p.state !== "New Jersey") continue;
      const street = [p.housenumber, p.street].filter(Boolean).join(" ");
      const primary = street || p.name || p.city || "";
      if (!primary) continue;
      const sub = [p.city, p.state, p.postcode].filter(Boolean).join(", ");
      const value = [primary, p.city, p.state, p.postcode].filter(Boolean).join(", ");
      out.push({ label: primary, sub, value, kind: "address" });
    }
    return out;
  } catch {
    return [];
  }
}



function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function AddressFinder() {
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

  // Close suggestions on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data: races = [] } = useQuery({
    queryKey: ["address-finder-races"],
    queryFn: async () => {
      const { data } = await supabase
        .from("races")
        .select("id, name, location, election_date, office_description")
        .order("election_date", { ascending: true });
      return data ?? [];
    },
  });

  const localSuggestions = useMemo(() => buildLocalSuggestions(input), [input]);
  const [remoteSuggestions, setRemoteSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounced street-address autocomplete via Photon.
  useEffect(() => {
    const q = input.trim();
    if (q.length < 3) {
      setRemoteSuggestions([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const t = setTimeout(async () => {
      const results = await fetchStreetSuggestions(q, controller.signal);
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
    () => (address ? races.filter((r) => raceMatchesAddress(r.location, match)) : []),
    [address, races, match],
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
    if (open && suggestions[activeIdx]) {
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
  const noMatch = address && !resolved;

  return (
    <section className="border-b bg-muted/40">
      <div className="container mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Personalized
            </p>
            <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              What's on <em className="italic text-primary">your</em> ballot?
            </h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              Enter your address, town, or ZIP and we'll surface only the races
              you can actually vote in — local, county, and statewide.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              We don't store your address on our servers. It stays in your browser.
            </p>
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1" ref={containerRef}>
                <MapPin className="pointer-events-none absolute left-3 top-[1.4rem] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setOpen(true);
                    setActiveIdx(0);
                  }}
                  onFocus={() => setOpen(true)}
                  onKeyDown={onKeyDown}
                  placeholder="e.g. Morristown, 07960, or 123 Main St, Boonton NJ"
                  className="h-12 pl-9 pr-9 text-base"
                  aria-label="Your address, town, or ZIP"
                  aria-autocomplete="list"
                  aria-expanded={open && suggestions.length > 0}
                  autoComplete="off"
                />
                {input && (
                  <button
                    type="button"
                    onClick={clear}
                    className="absolute right-2 top-[1.4rem] -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                    aria-label="Clear"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {open && suggestions.length > 0 && (
                  <ul
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-20 mt-2 max-h-80 overflow-auto rounded-xl border bg-popover p-1 shadow-elegant"
                  >
                    {suggestions.map((s, i) => (
                      <li key={`${s.kind}-${s.value}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={i === activeIdx}
                          onMouseEnter={() => setActiveIdx(i)}
                          onMouseDown={(e) => {
                            e.preventDefault(); // keep focus on input
                            commit(s.value);
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                            i === activeIdx ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                              s.kind === "zip"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {s.kind === "zip" ? <Hash className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{s.label}</span>
                            <span className="block truncate text-xs text-muted-foreground">{s.sub}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button type="submit" size="lg" className="h-12">
                <Search className="mr-1 h-4 w-4" />
                Find my races
              </Button>
            </form>



            {resolved && (
              <div className="mt-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
                    {filtered.length === 1 ? "race" : "races"} for{" "}
                    <span className="font-semibold text-foreground">{match.display}</span>
                    {match.countyMatch ? " · plus county & statewide" : ""}
                  </p>
                </div>

                {filtered.length === 0 ? (
                  <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                    No races found for that location yet. We currently cover Morris County, NJ.
                  </div>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {filtered.map((r) => (
                      <li key={r.id}>
                        <Link
                          to="/races/$raceId"
                          params={{ raceId: r.id }}
                          className="group flex h-full flex-col justify-between rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40"
                        >
                          <div>
                            <h3 className="font-display text-base font-semibold leading-tight">
                              {r.name}
                            </h3>
                            {r.location && (
                              <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" /> {r.location}
                              </p>
                            )}
                          </div>
                          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                            {r.election_date ? (
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {fmtDate(r.election_date)}
                              </span>
                            ) : <span />}
                            <span className="inline-flex items-center gap-1 font-medium text-primary">
                              Open
                              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {noMatch && (
              <div className="mt-6 rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                We couldn't recognize that address. Try a town name (e.g. "Morristown")
                or a 5-digit ZIP code. Currently covering Morris County, NJ.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
