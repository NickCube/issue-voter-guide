// Maps Morris County, NJ ZIP codes to the municipality string used in `races.location`.
// Source: USPS / NJ municipal boundaries. Some ZIPs span multiple towns; we map to the primary.
export const MORRIS_ZIP_TO_TOWN: Record<string, string> = {
  "07005": "Boonton", "07866": "Rockaway", "07801": "Dover", "07876": "Succasunna",
  "07885": "Wharton", "07847": "Kenvil", "07852": "Ledgewood", "07803": "Mine Hill",
  "07869": "Randolph", "07820": "Allamuchy", "07834": "Denville", "07435": "Newfoundland",
  "07438": "Oak Ridge", "07849": "Lake Hopatcong", "07850": "Landing", "07853": "Long Valley",
  "07857": "Netcong", "07871": "Lake Hopatcong", "07878": "Mount Tabor", "07881": "Wharton",
  "07882": "Washington", "07932": "Florham Park", "07927": "Cedar Knolls", "07928": "Chatham",
  "07930": "Chester", "07935": "Green Village", "07936": "East Hanover", "07940": "Madison",
  "07945": "Mendham", "07946": "Brookside", "07950": "Morris Plains", "07960": "Morristown",
  "07961": "Morristown", "07962": "Morristown", "07963": "Morristown", "07970": "Mount Freedom",
  "07976": "New Vernon", "07981": "Whippany", "07920": "Basking Ridge", "07924": "Bernardsville",
  "07054": "Parsippany", "07034": "Lake Hiawatha", "07045": "Montville", "07046": "Mountain Lakes",
  "07058": "Pine Brook", "07082": "Towaco", "07004": "Fairfield", "07444": "Pompton Plains",
  "07440": "Pequannock", "07442": "Pompton Lakes", "07405": "Butler", "07457": "Riverdale",
  "07417": "Franklin Lakes", "07035": "Lincoln Park", "07419": "Hamburg", "07480": "West Milford",
  "07421": "Hewitt", "07422": "Highland Lakes", "07424": "Little Falls", "07932-1": "Florham Park",
  "07930-1": "Chester", "07945-1": "Mendham",
};

// Aliases so a user typing "Boonton" matches "Boonton Town, NJ" and "Boonton Township, NJ" etc.
const TOWN_ALIASES: Record<string, string[]> = {
  boonton: ["Boonton Town", "Boonton Township"],
  chatham: ["Chatham Borough", "Chatham Township"],
  chester: ["Chester Borough", "Chester Township"],
  mendham: ["Mendham Borough", "Mendham Township"],
  rockaway: ["Rockaway", "Rockaway Township"],
  hanover: ["Hanover Township", "East Hanover Township"],
  washington: ["Washington Township"],
  "parsippany": ["Parsippany-Troy Hills"],
  "troy hills": ["Parsippany-Troy Hills"],
  "lake hiawatha": ["Parsippany-Troy Hills"],
  "pine brook": ["Montville Township"],
  towaco: ["Montville Township"],
  whippany: ["Hanover Township"],
  cedar: ["Hanover Township"],
  succasunna: ["Roxbury"],
  ledgewood: ["Roxbury"],
  kenvil: ["Roxbury"],
  landing: ["Roxbury"],
  "lake hopatcong": ["Mount Arlington Borough", "Jefferson Township"],
  "oak ridge": ["Jefferson Township"],
  "long valley": ["Washington Township"],
  brookside: ["Mendham Township"],
  "new vernon": ["Harding Township"],
  "green village": ["Chatham Township"],
  "mount freedom": ["Randolph"],
  "mount tabor": ["Mountain Lakes"],
};

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Given a free-form user address (or just a town/ZIP), return a list of
 * municipality name fragments that should match `races.location`.
 * Always returns statewide + county-wide tags so statewide races aren't hidden.
 */
export function matchAddressToTowns(input: string): {
  towns: string[];
  countyMatch: boolean;
  detectedFrom: "zip" | "town" | "none";
  display: string | null;
} {
  const text = normalize(input);
  if (!text) return { towns: [], countyMatch: false, detectedFrom: "none", display: null };

  const towns = new Set<string>();
  let detected: "zip" | "town" | "none" = "none";
  let display: string | null = null;

  // 1. Try ZIP code (5 digits)
  const zipMatch = text.match(/\b(\d{5})\b/);
  if (zipMatch) {
    const zip = zipMatch[1];
    const town = MORRIS_ZIP_TO_TOWN[zip];
    if (town) {
      detected = "zip";
      display = `${town} (ZIP ${zip})`;
      const key = normalize(town);
      if (TOWN_ALIASES[key]) TOWN_ALIASES[key].forEach((t) => towns.add(t));
      else towns.add(town);
    }
  }

  // 2. Try town-name matching against aliases and the canonical list
  if (towns.size === 0) {
    for (const [alias, mapped] of Object.entries(TOWN_ALIASES)) {
      if (text.includes(alias)) {
        mapped.forEach((t) => towns.add(t));
        detected = "town";
        if (!display) display = mapped[0];
      }
    }
  }

  // 3. Direct municipality keyword scan
  const KNOWN = [
    "Boonton", "Butler", "Chatham", "Chester", "Denville", "Dover", "East Hanover",
    "Florham Park", "Hanover", "Harding", "Jefferson", "Kinnelon", "Lincoln Park",
    "Long Hill", "Madison", "Mendham", "Mine Hill", "Montville", "Morris Plains",
    "Morris Township", "Morristown", "Mount Arlington", "Mount Olive", "Mountain Lakes",
    "Netcong", "Parsippany", "Pequannock", "Randolph", "Riverdale", "Rockaway",
    "Roxbury", "Victory Gardens", "Washington Township", "Wharton",
  ];
  for (const name of KNOWN) {
    if (text.includes(normalize(name))) {
      towns.add(name);
      detected = detected === "none" ? "town" : detected;
      if (!display) display = name;
    }
  }

  // Anything in NJ gets statewide + county races
  const countyMatch = towns.size > 0 || /\bnj\b|new jersey/.test(text);

  return { towns: Array.from(towns), countyMatch, detectedFrom: detected, display };
}

/**
 * Decide whether a race's location should be shown for the resolved address.
 */
export function raceMatchesAddress(
  location: string | null | undefined,
  match: ReturnType<typeof matchAddressToTowns>,
): boolean {
  if (!location) return false;
  const loc = location.toLowerCase();
  // Statewide / county-wide races
  if (match.countyMatch && (loc.includes("new jersey") || loc.includes("morris county") || loc.includes("congressional"))) {
    return true;
  }
  return match.towns.some((t) => loc.includes(t.toLowerCase()));
}
