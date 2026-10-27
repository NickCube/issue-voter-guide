import { describe, expect, test } from "bun:test";
import { matchAddressToTowns, matchingElectionRaces, raceMatchesAddress } from "./address-match";

describe("local election search", () => {
  test("South Bound Brook does not include Bound Brook", () => {
    const match = matchAddressToTowns("South Bound Brook, NJ");
    expect(match.towns).toEqual(["South Bound Brook"]);
    expect(raceMatchesAddress("Bound Brook", match)).toBe(false);
  });
  test("a state name alone cannot determine local eligibility", () => {
    expect(raceMatchesAddress("Somerset County", matchAddressToTowns("New Jersey"))).toBe(false);
  });
  test("districts are not assigned from a town or ZIP alone", () => {
    expect(raceMatchesAddress("Congressional District 7", matchAddressToTowns("Bridgewater"))).toBe(false);
  });
  test("November search excludes June and unverified records", () => {
    const rows = [
      { id: "nov", location: "Bridgewater", is_verified: true, election_type: "general", election_date: "2026-11-03" },
      { id: "june", location: "Bridgewater", is_verified: true, election_type: "primary", election_date: "2026-06-02" },
      { id: "pending", location: "Bridgewater", is_verified: false, election_type: "general", election_date: "2026-11-03" },
    ];
    expect(matchingElectionRaces(rows, "Bridgewater", "general").map((row) => row.id)).toEqual(["nov"]);
  });
});