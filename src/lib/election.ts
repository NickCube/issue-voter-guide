export const PRIMARY_DATE = "2026-06-02";

export type ElectionRecord = {
  election_type?: string | null;
  election_date?: string | null;
  filing_instruction?: string | null;
  is_verified?: boolean | null;
};

export function isPrimaryElection(race: ElectionRecord) {
  return race.election_type === "primary";
}

export function formatElectionDate(date?: string | null, style: "short" | "long" = "long") {
  if (!date) return "Date not confirmed";
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: style === "short" ? "short" : "long",
    day: "numeric",
  });
}

export function partyKey(party?: string | null): "dem" | "rep" | "other" {
  const value = (party ?? "").toLowerCase();
  if (value.includes("democrat")) return "dem";
  if (value.includes("republican")) return "rep";
  return "other";
}

export function verifiedRaceFilter<T extends ElectionRecord>(races: T[]) {
  return races.filter((race) => race.is_verified === true);
}