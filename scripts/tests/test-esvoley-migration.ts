import assert from "node:assert/strict";
import {
    canonicalizeRoundGroupName,
    findEsvoleyMatch,
    getEsvoleyGroups,
    isSameTeamPair,
} from "@/lib/scraper/esvoley-ingestion";
import type { EsvoleyMatch } from "@/lib/scraper/fetch-matches-esvoley";
import { parseEsvoleyDatetime } from "@/lib/scraper/parse-match-date";

assert.deepEqual(
    getEsvoleyGroups(167).map((group) => group.id),
    [85, 86, 87]
);
assert.equal(getEsvoleyGroups(152).length, 0);
assert.equal(canonicalizeRoundGroupName("Superliga 2 - Grupo A"), "Grupo A");
assert.equal(canonicalizeRoundGroupName("Liga Regular"), "Liga Regular");
assert.equal(
    parseEsvoleyDatetime("25/10/2025 17:00")?.toISOString(),
    "2025-10-25T15:00:00.000Z"
);
assert.equal(
    isSameTeamPair(
        "Club Voleibol Melilla",
        "Bus Leader San Roque",
        "CV Melilla",
        "Bus Leader San Roque"
    ),
    true
);
assert.equal(
    isSameTeamPair(
        "Denominación antigua",
        "Otro equipo",
        "Nombre EsVoley",
        "Otro equipo",
        new Map([
            ["Denominación antigua", "team-1"],
            ["Otro equipo", "team-2"],
            ["Nombre EsVoley", "team-1"],
        ])
    ),
    true
);

const esvoleyMatch: EsvoleyMatch & { esvoleyGroupName: string } = {
    rfevbMatchId: "1079",
    homeTeam: "Indescar Zaragoza",
    awayTeam: "Bus Leader San Roque",
    round: 1,
    matchDate: new Date("2026-10-03T14:15:00.000Z"),
    isFinished: false,
    isDelayed: false,
    originalRound: "J1",
    statsLink: null,
    homeSets: null,
    awaySets: null,
    esvoleyGroupName: "Grupo A",
};

const matched = findEsvoleyMatch(
    {
        matchId: "12345",
        round: 1,
        homeTeam: "Indescar Zaragoza",
        awayTeam: "Bus Leader San Roque",
        matchDate: null,
    },
    [esvoleyMatch],
    "Grupo A"
);

assert.equal(matched?.rfevbMatchId, "1079");
assert.equal(
    findEsvoleyMatch(
        {
            matchId: "12345",
            round: 2,
            homeTeam: "Equipo Distinto",
            awayTeam: "Otro Equipo",
            matchDate: null,
        },
        [esvoleyMatch],
        "Grupo A"
    ),
    null
);

console.log("EsVoley migration mapping tests passed.");
