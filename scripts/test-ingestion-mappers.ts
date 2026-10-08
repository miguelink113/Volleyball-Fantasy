import assert from "node:assert/strict";
import type {
    ScrapedCompetitionTeam,
    ScrapedCompetitionPlayer,
} from "@/lib/scraper/fetch-competition-roster";
import {mapTeam} from "@/lib/services/ingestion/map.team";
import {mapPlayer} from "@/lib/services/ingestion/map.player";

// --- Fixtures ---

const COMPETITION_UUID = "11111111-1111-1111-1111-111111111111";
const SEASON_UUID = "22222222-2222-2222-2222-222222222222";
const TEAM_UUID = "33333333-3333-3333-3333-333333333333";

const fixtureTeam: ScrapedCompetitionTeam = {
    id: "rfevb:team:1318",
    rfevbId: "1318",
    name: "Bus Leader San Roque",
    logoUrl: "https://images.dataproject.com/rfevb/TeamLogo/100/40/TeamLogo_1318.jpg",
    competitionId: "152",
    detailsUrl:
        "https://rfevb-web.dataproject.com/CompetitionTeamDetails.aspx?TeamID=1318&ID=152",
};

const fixturePlayer: ScrapedCompetitionPlayer = {
    id: "rfevb:player:8825",
    rfevbId: "8825",
    firstName: "Vidal",
    lastName: "Allen Serrano Luis",
    displayName: "Allen Serrano Luis Vidal",
    position: "middle",
    currentTeamId: "rfevb:team:1312",
    dorsal: 14,
    competitionId: "152",
    teamRfevbId: "1312",
    detailsUrl:
        "https://rfevb-web.dataproject.com/PlayerDetails.aspx?TeamID=1312&PlayerID=8825&ID=152",
};

// --- Tests ---

console.log("== mapTeam ==");

const teamRow = mapTeam(fixtureTeam, {
    competitionId: COMPETITION_UUID,
    seasonId: SEASON_UUID,
});
assert.equal(teamRow.competition_id, COMPETITION_UUID);
assert.equal(teamRow.season_id, SEASON_UUID);
assert.equal(teamRow.rfevb_id, "1318");
assert.equal(teamRow.name, "Bus Leader San Roque");
assert.equal(teamRow.active, true);
console.log("  ✔ mapea los campos esperados");

// Trim defensivo
const teamRowTrimmed = mapTeam(
    { ...fixtureTeam, name: "  Padded  " },
    { competitionId: COMPETITION_UUID, seasonId: SEASON_UUID }
);
assert.equal(teamRowTrimmed.name, "Padded");
console.log("  ✔ hace trim del nombre");

// Falla si no hay nombre
assert.throws(
    () =>
        mapTeam(
            { ...fixtureTeam, name: "" },
            { competitionId: COMPETITION_UUID, seasonId: SEASON_UUID }
        ),
    /without name/
);
console.log("  ✔ rechaza equipos sin nombre");

assert.throws(
    () =>
        mapTeam(
            { ...fixtureTeam, rfevbId: undefined },
            { competitionId: COMPETITION_UUID, seasonId: SEASON_UUID }
        ),
    /without rfevbId/
);
console.log("  ✔ rechaza equipos sin rfevbId");

assert.throws(
    () =>
        mapTeam(
            { ...fixtureTeam, rfevbId: "   " },
            { competitionId: COMPETITION_UUID, seasonId: SEASON_UUID }
        ),
    /without rfevbId/
);
console.log("  ✔ rechaza rfevbId vacío o solo espacios");

console.log("\n== mapPlayer ==");

const teamIdByRfevbId = new Map<string, string>([["1312", TEAM_UUID]]);

const playerRow = mapPlayer(fixturePlayer, {
    competitionId: COMPETITION_UUID,
    seasonId: SEASON_UUID,
    teamIdByRfevbId,
});
assert.equal(playerRow.competition_id, COMPETITION_UUID);
assert.equal(playerRow.season_id, SEASON_UUID);
assert.equal(playerRow.team_id, TEAM_UUID);
assert.equal(playerRow.rfevb_id, "8825");
assert.equal(playerRow.display_name, "Allen Serrano Luis Vidal");
assert.equal(playerRow.position, "middle");
assert.equal(playerRow.dorsal, 14);
assert.equal(playerRow.active, true);
console.log("  ✔ mapea los campos esperados");

// Falla si el equipo no está resuelto
assert.throws(
    () =>
        mapPlayer(fixturePlayer, {
            competitionId: COMPETITION_UUID,
            seasonId: SEASON_UUID,
            teamIdByRfevbId: new Map(),
        }),
    /team not found/
);
console.log("  ✔ rechaza jugadores cuyo equipo no está resuelto");

// Dorsal 0 o negativo → null
const playerNoDorsal = mapPlayer(
    { ...fixturePlayer, dorsal: 0 },
    { competitionId: COMPETITION_UUID, seasonId: SEASON_UUID, teamIdByRfevbId }
);
assert.equal(playerNoDorsal.dorsal, null);
console.log("  ✔ normaliza dorsal 0 a null");

// Position inválida → unknown
const playerUnknown = mapPlayer(
    { ...fixturePlayer, position: "unknown" },
    { competitionId: COMPETITION_UUID, seasonId: SEASON_UUID, teamIdByRfevbId }
);
assert.equal(playerUnknown.position, "unknown");
console.log("  ✔ acepta posición unknown");

// Falla sin displayName
assert.throws(
    () =>
        mapPlayer(
            { ...fixturePlayer, displayName: "" },
            { competitionId: COMPETITION_UUID, seasonId: SEASON_UUID, teamIdByRfevbId }
        ),
    /without displayName/
);
console.log("  ✔ rechaza jugadores sin displayName");

assert.throws(
    () =>
        mapPlayer(
            { ...fixturePlayer, rfevbId: undefined },
            { competitionId: COMPETITION_UUID, seasonId: SEASON_UUID, teamIdByRfevbId }
        ),
    /without rfevbId/
);
console.log("  ✔ rechaza jugadores sin rfevbId");

console.log("\n✅ mappers OK");