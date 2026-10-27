import { describe, it as test } from "node:test";
import assert from "node:assert/strict";
import { matchAddressToTowns, matchingElectionRaces, raceMatchesAddress } from "./address-match";

describe("local election search", () => {
  test("South Bound Brook does not include Bound Brook", () => {
    const match = matchAddressToTowns("South Bound Brook, NJ");
    assert.deepEqual(match.towns, ["South Bound Brook"]);
    assert.equal(raceMatchesAddress("Bound Brook", match), false);
  });
  test("a state name alone cannot determine local eligibility", () => {
    assert.equal(raceMatchesAddress("Somerset County", matchAddressToTowns("New Jersey")), false);
  });
  test("districts are not assigned from a town or ZIP alone", () => {
    assert.equal(raceMatchesAddress("Congressional District 7", matchAddressToTowns("Bridgewater")), false);
  });
  test("November search excludes June and unverified records", () => {
    const rows = [
      { id: "nov", location: "Bridgewater", is_verified: true, election_type: "general", election_date: "2026-11-03" },
      { id: "june", location: "Bridgewater", is_verified: true, election_type: "primary", election_date: "2026-06-02" },
      { id: "pending", location: "Bridgewater", is_verified: false, election_type: "general", election_date: "2026-11-03" },
    ];
    assert.deepEqual(matchingElectionRaces(rows, "Bridgewater", "general").map((row) => row.id), ["nov"]);
  });
});