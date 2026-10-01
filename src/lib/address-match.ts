// Somerset County ZIP-to-municipality lookup used for ballot matching.
export const SOMERSET_ZIP_TO_TOWN: Record<string, string> = {
  "07059": "Warren", "07060": "North Plainfield", "07062": "North Plainfield",
  "07063": "North Plainfield", "07069": "Watchung", "07920": "Basking Ridge",
  "07921": "Bedminster", "07924": "Bernardsville", "07931": "Far Hills",
  "07934": "Gladstone", "07938": "Liberty Corner", "07939": "Lyons",
  "07977": "Peapack-Gladstone", "07978": "Pluckemin", "08502": "Belle Mead",
  "08504": "Blawenburg", "08528": "Kingston", "08540": "Princeton",
  "08553": "Rocky Hill", "08558": "Skillman", "08805": "Bound Brook",
  "08807": "Bridgewater", "08821": "Flagtown", "08823": "Franklin Park",
  "08835": "Manville", "08836": "Martinsville", "08844": "Hillsborough",
  "08853": "Neshanic Station", "08869": "Raritan", "08873": "Somerset",
  "08875": "Somerset", "08876": "Somerville", "08880": "South Bound Brook",
  "08890": "Zarephath",
};

export const SOMERSET_TOWNS = [
  "Bedminster", "Bernards", "Bernardsville", "Bound Brook", "Branchburg",
  "Bridgewater", "Far Hills", "Franklin", "Green Brook", "Hillsborough",
  "Manville", "Millstone", "Montgomery", "North Plainfield", "Peapack-Gladstone",
  "Raritan", "Rocky Hill", "Somerville", "South Bound Brook", "Warren", "Watchung",
] as const;

const ALIASES: Record<string, string[]> = {
  "basking ridge": ["Bernards"],
  somerset: ["Franklin"],
  martinsville: ["Bridgewater"],
  "belle mead": ["Montgomery"],
  skillman: ["Montgomery"],
  gladstone: ["Peapack-Gladstone"],
  pluckemin: ["Bedminster"],
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function matchAddressToTowns(input: string): {
  towns: string[];
  countyMatch: boolean;
  detectedFrom: "zip" | "town" | "none";
  display: string | null;
} {
  const text = normalize(input);
  if (!text) return { towns: [], countyMatch: false, detectedFrom: "none", display: null };

  const towns = new Set<string>();
  let detectedFrom: "zip" | "town" | "none" = "none";
  let display: string | null = null;
  const zip = text.match(/\b(\d{5})\b/)?.[1];
  const zipTown = zip ? SOMERSET_ZIP_TO_TOWN[zip] : undefined;
  if (zip && zipTown) {
    const alias = ALIASES[normalize(zipTown)];
    (alias ?? [zipTown]).forEach((town) => towns.add(town));
    detectedFrom = "zip";
    display = `${zipTown} (ZIP ${zip})`;
  }

  if (towns.size === 0) {
    for (const [alias, matches] of Object.entries(ALIASES)) {
      if (text.includes(alias)) {
        matches.forEach((town) => towns.add(town));
        display = matches[0];
        detectedFrom = "town";
      }
    }
  }

  for (const town of SOMERSET_TOWNS) {
    if (text.includes(normalize(town))) {
      towns.add(town);
      display ??= town;
      if (detectedFrom === "none") detectedFrom = "town";
    }
  }

  return {
    towns: [...towns],
    countyMatch: towns.size > 0 || /\bnj\b|new jersey/.test(text),
    detectedFrom,
    display,
  };
}

export function raceMatchesAddress(
  location: string | null | undefined,
  match: ReturnType<typeof matchAddressToTowns>,
) {
  if (!location) return false;
  const value = normalize(location);
  if (
    match.countyMatch &&
    (value.includes("somerset county") || value.includes("new jersey") || value.includes("district"))
  ) return true;
  return match.towns.some((town) => value.includes(normalize(town)));
}